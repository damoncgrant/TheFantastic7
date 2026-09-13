"""Reusable demo records and image helpers for Jobbler management commands."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile

from .models import Application, Company, Job, Resume, UserProfile
from .resume_builder import build_resume


DEMO_PASSWORD = "demo1234"
DEMO_RECRUITER_EMAIL = "recruiter@jobbler.demo"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
USER_AGENT = "JobblerHackathonDemo/1.0 (educational prototype)"


@dataclass(frozen=True)
class ImageSource:
    download_url: str
    source_page: str
    credit: str


def picsum(seed: str) -> ImageSource:
    """Return a stable random web photo for a job card."""
    return ImageSource(
        download_url=f"https://picsum.photos/seed/{quote(seed)}/1200/800",
        source_page="https://picsum.photos/",
        credit="Lorem Picsum (photos sourced from Unsplash)",
    )


def commons(filename: str) -> ImageSource:
    """Return an 800px Wikimedia Commons rendition of a known file."""
    encoded = quote(filename.replace(" ", "_"))
    return ImageSource(
        download_url=f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{encoded}?width=800",
        source_page=f"https://commons.wikimedia.org/wiki/File:{encoded}",
        credit="Wikimedia Commons; see the source page for creator and licence",
    )


JOBS = [
    {
        "company": "Dunder Mifflin Paper Company",
        "title": "Assistant to the Regional Manager",
        "description": "Keep the Scranton branch organized, protect the office from bears, and remind everyone that the title is assistant to—not assistant regional manager.",
        "location": "Scranton, PA · On-site",
        "compensation": "$54,000 + unlimited beet-related anecdotes",
        "employment_type": "Full-time",
        "requirements": ["Office operations", "Sales", "Battlestar Galactica"],
        "image": picsum("jobbler-dunder-mifflin-office"),
    },
    {
        "company": "Central Perk",
        "title": "Coffeehouse Barista & Couch Guardian",
        "description": "Serve espresso, remember six complicated orders, and politely protect the orange couch from tourists during peak hours.",
        "location": "New York, NY · On-site",
        "compensation": "$24/hour + tips and occasional acoustic sets",
        "employment_type": "Part-time",
        "requirements": ["Customer service", "Latte art", "Sarcasm tolerance"],
        "image": picsum("jobbler-central-perk-cafe"),
    },
    {
        "company": "Pawnee Parks Department",
        "title": "Deputy Director of Tiny Parks",
        "description": "Turn abandoned lots into joyful public spaces, survive town halls, and maintain enthusiasm when citizens complain about raccoons.",
        "location": "Pawnee, IN · Hybrid",
        "compensation": "$68,000 + waffle stipend",
        "employment_type": "Full-time",
        "requirements": ["Public service", "Project planning", "Boundless optimism"],
        "image": picsum("jobbler-pawnee-parks"),
    },
    {
        "company": "NYPD 99th Precinct",
        "title": "Detective, Cool Motive Division",
        "description": "Solve unusual cases, complete the paperwork eventually, and participate in a strictly professional annual Halloween heist.",
        "location": "Brooklyn, NY · On-site",
        "compensation": "$76,000 + tactical snacks",
        "employment_type": "Full-time",
        "requirements": ["Investigation", "Teamwork", "Excellent catchphrases"],
        "image": picsum("jobbler-nine-nine-precinct"),
    },
    {
        "company": "Bluth Company",
        "title": "Model Home Operations Coordinator",
        "description": "Keep the model home presentable, track frozen bananas as business expenses, and ensure there is always money in the banana stand.",
        "location": "Newport Beach, CA · Hybrid",
        "compensation": "$71,000 (subject to family approval)",
        "employment_type": "Full-time",
        "requirements": ["Operations", "Budgeting", "Family diplomacy"],
        "image": picsum("jobbler-bluth-model-home"),
    },
    {
        "company": "Paddy's Pub",
        "title": "Marketing Coordinator / Wildcard",
        "description": "Promote the least predictable bar in Philadelphia with campaigns that are legal, affordable, and preferably written down first.",
        "location": "Philadelphia, PA · On-site",
        "compensation": "$22/hour + one staff beverage",
        "employment_type": "Part-time",
        "requirements": ["Social media", "Event planning", "Crisis management"],
        "image": picsum("jobbler-paddys-pub"),
    },
    {
        "company": "Krusty Burger",
        "title": "Senior Burger Quality Tester",
        "description": "Inspect burgers for structural integrity, evaluate curly fries, and maintain standards even when the mascot is unavailable.",
        "location": "Springfield · On-site",
        "compensation": "$27/hour + staff meal",
        "employment_type": "Full-time",
        "requirements": ["Quality assurance", "Food safety", "Elastic waistband"],
        "image": picsum("jobbler-krusty-burger"),
    },
    {
        "company": "Springfield Nuclear Power Plant",
        "title": "Sector 7G Safety Monitor",
        "description": "Watch the control panel, complete the safety checklist, and keep all glowing objects inside their clearly marked containers.",
        "location": "Springfield · On-site",
        "compensation": "$82,000 + dental plan",
        "employment_type": "Full-time",
        "requirements": ["Safety procedures", "Control panels", "Donut awareness"],
        "image": picsum("jobbler-springfield-power-plant"),
    },
    {
        "company": "Planet Express",
        "title": "Interplanetary Delivery Specialist",
        "description": "Deliver packages across the known universe, sign alien customs forms, and return the ship with roughly the same number of pieces.",
        "location": "New New York · Mostly remote (space)",
        "compensation": "45,000 Nixonbucks + hazard pay",
        "employment_type": "Contract",
        "requirements": ["Navigation", "Customer service", "Basic spaceship repair"],
        "image": picsum("jobbler-planet-express-delivery"),
    },
    {
        "company": "Bob's Burgers",
        "title": "Burger of the Day Copywriter",
        "description": "Invent pun-forward burger names, help during the lunch rush, and keep the chalkboard legible despite family feedback.",
        "location": "Seymour's Bay, NJ · On-site",
        "compensation": "$25/hour + burger of the day",
        "employment_type": "Part-time",
        "requirements": ["Copywriting", "Food service", "Advanced puns"],
        "image": picsum("jobbler-bobs-burgers-kitchen"),
    },
]


CANDIDATES = [
    {
        "name": "Michael Scott", "show": "The Office", "actor": "Steve Carell",
        "email": "michael.scott@jobbler.demo", "headline": "Regional Manager & World's Best Boss",
        "bio": "People-person, motivational speaker, and self-described management visionary seeking a role with fewer conference-room interventions.",
        "skills": ["Leadership", "Sales", "Improvisation", "Team morale"],
        "experience": ("Regional Manager", "Dunder Mifflin", "Managed a branch that regularly outperformed expectations.\nHosted memorable awards ceremonies."),
        "education": ("Scranton Business Park School of Hard Knocks", "Management Studies"),
        "project": ("The Michael Scott Paper Company", "Entrepreneurship, Negotiation"),
        "job": "Assistant to the Regional Manager",
        "image": commons("Steve Carell 2010.jpg"),
    },
    {
        "name": "Dwight Schrute", "show": "The Office", "actor": "Rainn Wilson",
        "email": "dwight.schrute@jobbler.demo", "headline": "Top Salesperson, Beet Farmer & Volunteer Sheriff",
        "bio": "Disciplined operator with elite paper-sales numbers, practical security knowledge, and access to a working beet farm.",
        "skills": ["Sales", "Security", "Agriculture", "Preparedness"],
        "experience": ("Assistant to the Regional Manager", "Dunder Mifflin", "Led sales rankings and emergency drills.\nMaintained strict desk-area security."),
        "education": ("Schrute Family Training Academy", "Sales and Survival"),
        "project": ("Schrute Farms Expansion", "Operations, Hospitality"),
        "job": "Sector 7G Safety Monitor",
        "image": commons("Rainn Wilson 2009 cropped.jpg"),
    },
    {
        "name": "Rachel Green", "show": "Friends", "actor": "Jennifer Aniston",
        "email": "rachel.green@jobbler.demo", "headline": "Fashion Buyer & Customer Experience Specialist",
        "bio": "Fashion professional who built an independent career from an entry-level coffeehouse role and knows when something is definitely not on a break.",
        "skills": ["Fashion buying", "Customer service", "Merchandising", "Networking"],
        "experience": ("Fashion Buyer", "Ralph Lauren", "Coordinated seasonal selections and vendor relationships.\nTranslated trends into customer-ready assortments."),
        "education": ("Lincoln High School", "Fashion and Retail"),
        "project": ("Central Perk Customer Refresh", "Merchandising, Service"),
        "job": "Coffeehouse Barista & Couch Guardian",
        "image": commons("Jennifer Aniston 2011 (cropped).jpg"),
    },
    {
        "name": "Joey Tribbiani", "show": "Friends", "actor": "Matt LeBlanc",
        "email": "joey.tribbiani@jobbler.demo", "headline": "Actor, Brand Ambassador & Sandwich Specialist",
        "bio": "Charismatic performer with soap-opera experience, strong memorization after several attempts, and unmatched enthusiasm for lunch.",
        "skills": ["Acting", "Brand promotion", "Auditions", "Food tasting"],
        "experience": ("Dr. Drake Ramoray", "Days of Our Lives", "Delivered high-stakes medical dialogue on camera.\nBuilt a loyal daytime television audience."),
        "education": ("Estelle Leonard Acting Studio", "Screen Performance"),
        "project": ("Ichiban Lipstick Campaign", "Commercial Acting"),
        "job": "Senior Burger Quality Tester",
        "image": commons("Matt LeBlanc 2010.jpg"),
    },
    {
        "name": "Phoebe Buffay", "show": "Friends", "actor": "Lisa Kudrow",
        "email": "phoebe.buffay@jobbler.demo", "headline": "Musician, Massage Therapist & Creative Problem Solver",
        "bio": "Adaptable creative professional with live-performance experience, strong intuition, and an original catalogue led by a song about a memorable cat.",
        "skills": ["Music", "Client care", "Songwriting", "Conflict resolution"],
        "experience": ("Resident Musician", "Central Perk", "Performed original material for live audiences.\nMaintained composure through highly varied feedback."),
        "education": ("New York School of Lived Experience", "Creative Arts"),
        "project": ("Smelly Cat", "Songwriting, Guitar"),
        "job": "Burger of the Day Copywriter",
        "image": commons("Lisa Kudrow crop.jpg"),
    },
    {
        "name": "Jake Peralta", "show": "Brooklyn Nine-Nine", "actor": "Andy Samberg",
        "email": "jake.peralta@jobbler.demo", "headline": "Detective & Elaborate Heist Planner",
        "bio": "Award-winning detective with excellent instincts, questionable desk organization, and a proven record on impossible cases.",
        "skills": ["Investigation", "Interviewing", "Teamwork", "Puzzle solving"],
        "experience": ("Detective", "NYPD 99th Precinct", "Solved complex cases and built trusted community relationships.\nPlanned annual team-building heists."),
        "education": ("Police Academy", "Criminal Investigation"),
        "project": ("Halloween Heist", "Planning, Deception, Teamwork"),
        "job": "Detective, Cool Motive Division",
        "image": commons("Andy Samberg by David Shankbone.jpg"),
    },
    {
        "name": "Rosa Diaz", "show": "Brooklyn Nine-Nine", "actor": "Stephanie Beatriz",
        "email": "rosa.diaz@jobbler.demo", "headline": "Detective & High-Stakes Operations Specialist",
        "bio": "Focused investigator known for discretion, decisive action, and revealing exactly as much personal information as the situation requires.",
        "skills": ["Investigation", "Tactical planning", "Motorcycles", "Privacy"],
        "experience": ("Detective", "NYPD 99th Precinct", "Led sensitive investigations and field operations.\nMentored colleagues using concise feedback."),
        "education": ("Police Academy", "Criminal Justice"),
        "project": ("Safe House Operations", "Security, Logistics"),
        "job": "Marketing Coordinator / Wildcard",
        "image": commons("Actor Stephanie Beatriz (cropped).jpg"),
    },
    {
        "name": "Leslie Knope", "show": "Parks and Recreation", "actor": "Amy Poehler",
        "email": "leslie.knope@jobbler.demo", "headline": "Public Servant, Organizer & Waffle Advocate",
        "bio": "Energetic civic leader who converts binders, breakfast food, and relentless optimism into completed public projects.",
        "skills": ["Public policy", "Project management", "Community outreach", "Binders"],
        "experience": ("Deputy Director", "Pawnee Parks Department", "Delivered community projects through cross-functional coordination.\nFacilitated spirited public meetings."),
        "education": ("Indiana University", "Public Administration"),
        "project": ("Pawnee Commons", "Planning, Community Engagement"),
        "job": "Deputy Director of Tiny Parks",
        "image": commons("Amy Poehler 2012.jpg"),
    },
    {
        "name": "Ron Swanson", "show": "Parks and Recreation", "actor": "Nick Offerman",
        "email": "ron.swanson@jobbler.demo", "headline": "Director, Woodworker & Breakfast Professional",
        "bio": "Practical department leader who values craftsmanship, personal responsibility, concise meetings, and breakfast foods in responsible quantities.",
        "skills": ["Leadership", "Woodworking", "Budget control", "Breakfast"],
        "experience": ("Director", "Pawnee Parks Department", "Managed public resources with minimal meetings.\nBuilt durable furniture without outside assistance."),
        "education": ("Practical School of Self-Reliance", "Woodworking"),
        "project": ("Swanson Chair", "Woodworking, Quality Control"),
        "job": "Model Home Operations Coordinator",
        "image": commons("Nick Offerman 2012 (cropped).jpg"),
    },
    {
        "name": "Peter Griffin", "show": "Family Guy", "actor": "Seth MacFarlane",
        "email": "peter.griffin@jobbler.demo", "headline": "Brewery Worker & Community Storyteller",
        "bio": "Enthusiastic generalist with manufacturing experience, a strong local network, and an unmatched supply of unexpectedly detailed cutaway anecdotes.",
        "skills": ["Manufacturing", "Storytelling", "Team morale", "Creative thinking"],
        "experience": ("Shipping Department Employee", "Pawtucket Brewery", "Supported daily brewery operations and team morale.\nResponded creatively to unusual workplace events."),
        "education": ("James Woods Regional High School", "General Studies"),
        "project": ("Neighborhood Variety Hour", "Comedy, Production"),
        "job": "Interplanetary Delivery Specialist",
        "image": commons("Seth MacFarlane by Gage Skidmore.jpg"),
    },
]


def ensure_account(*, email: str, name: str, role: str):
    """Create or refresh a predictable demo login."""
    user_model = get_user_model()
    account, _ = user_model.objects.get_or_create(email=email)
    account.name = name
    account.role = role
    account.set_password(DEMO_PASSWORD)
    account.save()
    return account


def ensure_recruiter() -> UserProfile:
    user_model = get_user_model()
    ensure_account(
        email=DEMO_RECRUITER_EMAIL,
        name="Jan Levinson",
        role=user_model.Role.EMPLOYER,
    )
    recruiter, _ = UserProfile.objects.update_or_create(
        email=DEMO_RECRUITER_EMAIL,
        defaults={
            "name": "Jan Levinson",
            "role": UserProfile.Role.RECRUITER,
            "headline": "Vice President of Regional Hiring",
            "bio": "Coordinating an unusually broad portfolio of comedy-universe employers.",
            "skills": ["Recruiting", "Negotiation", "Performance reviews"],
        },
    )
    return recruiter


def download_image(source: ImageSource) -> tuple[bytes, str]:
    """Download and validate a small image without adding third-party packages."""
    for attempt, delay in enumerate((0, 2, 5, 10), start=1):
        if delay:
            time.sleep(delay)
        request = Request(source.download_url, headers={"User-Agent": USER_AGENT})
        try:
            with urlopen(request, timeout=30) as response:
                content_type = response.headers.get_content_type()
                content = response.read(MAX_IMAGE_BYTES + 1)
            break
        except HTTPError as error:
            if error.code not in {429, 502, 503, 504} or attempt == 4:
                raise
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError(f"Unsupported image type from {source.download_url}: {content_type}")
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError(f"Image exceeds 5 MB: {source.download_url}")
    extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[content_type]
    return content, extension


def attach_image(instance, field_name: str, source: ImageSource, stem: str, *, refresh: bool) -> bool:
    """Attach a downloaded image unless an existing one should be retained."""
    field = getattr(instance, field_name)
    if field and not refresh:
        return False
    content, extension = download_image(source)
    if field:
        field.delete(save=False)
    field.save(f"{stem}{extension}", ContentFile(content), save=True)
    record_image_source(f"{instance._meta.label_lower}:{instance.pk}:{field_name}", source)
    return True


def record_image_source(key: str, source: ImageSource) -> None:
    """Keep demo-image attribution beside uploaded media."""
    manifest_path = Path(settings.MEDIA_ROOT) / "demo_image_sources.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        manifest = {}
    manifest[key] = {
        "source_page": source.source_page,
        "download_url": source.download_url,
        "credit": source.credit,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def seed_jobs(*, include_images: bool = True, refresh_images: bool = False, stdout=None) -> list[Job]:
    recruiter = ensure_recruiter()
    created_jobs = []
    for index, data in enumerate(JOBS, start=1):
        company, _ = Company.objects.update_or_create(name=data["company"], defaults={})
        job, _ = Job.objects.update_or_create(
            company=company,
            recruiter=recruiter,
            title=data["title"],
            defaults={key: data[key] for key in (
                "description", "location", "compensation", "employment_type", "requirements"
            )} | {"is_active": True},
        )
        if include_images:
            changed = attach_image(job, "photo", data["image"], f"demo-job-{index:02d}", refresh=refresh_images)
            if stdout and changed:
                stdout.write(f"Downloaded job photo {index}/10")
        created_jobs.append(job)
    return created_jobs


def resume_data(candidate: dict) -> dict:
    experience_title, experience_company, experience_bullets = candidate["experience"]
    school, degree = candidate["education"]
    project_name, project_stack = candidate["project"]
    return {
        "contact": {
            "name": candidate["name"],
            "phone": "555-010-2026",
            "email": candidate["email"],
            "linkedin": "linkedin.com/in/demo-candidate",
            "github": "",
        },
        "education": [{
            "school": school,
            "location": candidate["show"],
            "degree": degree,
            "expectedGraduation": "Completed",
        }],
        "experience": [{
            "title": experience_title,
            "company": experience_company,
            "location": candidate["show"],
            "dates": "2021–Present",
            "bullets": experience_bullets,
        }],
        "projects": [{
            "name": project_name,
            "stack": project_stack,
            "dates": "2025",
            "bullets": "Delivered a memorable result despite highly unusual constraints.",
        }],
        "skills": {
            "languages": "English",
            "frameworks": ", ".join(candidate["skills"][:2]),
            "tools": ", ".join(candidate["skills"][2:]),
            "libraries": "",
        },
    }


def seed_candidates(*, include_images: bool = True, refresh_images: bool = False, stdout=None) -> list[UserProfile]:
    recruiter = ensure_recruiter()
    demo_jobs = {
        job.title: job
        for job in Job.objects.filter(recruiter=recruiter).select_related("company")
    }
    missing_jobs = sorted({candidate["job"] for candidate in CANDIDATES} - demo_jobs.keys())
    if missing_jobs:
        raise ValueError("Demo jobs are missing. Run `python manage.py seed_demo_jobs` first.")

    user_model = get_user_model()
    profiles = []
    for index, data in enumerate(CANDIDATES, start=1):
        account = ensure_account(
            email=data["email"],
            name=data["name"],
            role=user_model.Role.APPLICANT,
        )
        profile, _ = UserProfile.objects.update_or_create(
            email=data["email"],
            defaults={
                "name": data["name"],
                "role": UserProfile.Role.CANDIDATE,
                "headline": data["headline"],
                "bio": data["bio"],
                "skills": data["skills"],
            },
        )
        if include_images:
            changed = attach_image(profile, "photo", data["image"], f"demo-candidate-{index:02d}", refresh=refresh_images)
            if stdout and changed:
                stdout.write(f"Downloaded candidate photo {index}/10")

        builder_data = resume_data(data)
        Resume.objects.filter(user=account, is_default=True).update(is_default=False)
        resume, _ = Resume.objects.update_or_create(
            user=account,
            name=f"{data['name']} Demo Resume",
            defaults={
                "builder_data": builder_data,
                "latex": build_resume(builder_data).decode("utf-8"),
                "is_default": True,
            },
        )
        Application.objects.update_or_create(
            job=demo_jobs[data["job"]],
            candidate=profile,
            defaults={
                "resume": resume,
                "candidate_decision": Application.CandidateDecision.APPLIED,
                "recruiter_decision": Application.RecruiterDecision.PENDING,
                "stage": Application.Stage.APPLIED,
            },
        )
        profiles.append(profile)
    return profiles

from flask import Flask, request, render_template_string, jsonify
from flask_cors import CORS
import os
import json
import requests
import re
import random
from datetime import datetime, timedelta
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import numpy as np

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})  # Enable CORS for all routes

# Configure API keys


# Default tech stack icons/logos as base64 to avoid external dependencies
TECH_ICONS = {
    "python": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
    "javascript": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
    "react": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
    "vue": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg",
    "angular": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg",
    "node": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
    "flask": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg",
    "django": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg",
    "express": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg",
    "mongodb": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
    "mysql": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
    "postgresql": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg",
    "docker": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
    "kubernetes": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg",
    "aws": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
    "gcp": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg",
    "azure": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg",
    "git": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg",
    "github": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
    "gitlab": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg",
    "jenkins": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg",
    "circleci": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/circleci/circleci-plain.svg",
    "terraform": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg",
    "ansible": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ansible/ansible-original.svg",
    "html": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
    "css": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
    "typescript": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
    "tailwind": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg",
    "bootstrap": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg",
    "redis": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg",
    "graphql": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/graphql/graphql-plain.svg",
    "java": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
    "spring": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg",
    "csharp": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
    "dotnet": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg",
    "php": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
    "laravel": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-plain.svg",
    "go": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
    "rust": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg",
    "flutter": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg",
    "swift": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg",
    "kotlin": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg",
}

def query_llm(prompt, specific_section=None):
    """Query the Groq LLM API with a prompt for a specific dashboard section"""
    
    # Check if API key exists and is valid
 
    
    # Create a section-specific prompt
    if specific_section:
        prompt = f"For a software development project described as: '{prompt}', generate only the {specific_section} section. Provide response in valid JSON format."
    
    headers = {
        # "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "llama3-70b-8192",
        "messages": [
            {"role": "system", "content": "You are a software development expert assistant. Provide responses in valid JSON format only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        
        content = response.json()["choices"][0]["message"]["content"]
        # Clean the response
        content = content.strip()
        if content.startswith('```json'):
            content = re.sub(r'^```json\n', '', content)
        elif content.startswith('```'):
            content = re.sub(r'^```\n', '', content)
        if content.endswith('```'):
            content = re.sub(r'\n```$', '', content)
        content = content.strip()
        
        return json.loads(content)
    except requests.exceptions.RequestException as e:
        print(f"API request error: {str(e)}")
        raise
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        raise ValueError(f"Invalid JSON response from LLM API: {content}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise

def generate_project_dashboard(description):
    """Generate complete project dashboard by making separate LLM queries for each section"""
    
    try:
        # 1. Get project overview (name, description)
        overview_prompt = f"Generate a project name and detailed description for this software project: '{description}'. Return as JSON with 'project_name' and 'description' fields."
        overview_data = query_llm(overview_prompt)
        
        # 2. Get tech stack recommendations
        tech_stack_prompt = f"For a software project described as: '{description}', recommend the best technology stack. Group as frontend, backend, database, and devops categories in JSON format."
        tech_stack_data = query_llm(tech_stack_prompt)
        
        # 3. Get development phases
        phases_prompt = f"For a software project described as: '{description}', create a comprehensive development plan with phases. Each phase should have a name, duration, description, and 3-5 key tasks with priorities. Return as JSON."
        phases_data = query_llm(phases_prompt)
        
        # 4. Get features list
        features_prompt = f"For a software project described as: '{description}', list the top 5-7 features that should be implemented, with name, description and priority (High/Medium/Low) for each. Return as JSON."
        features_data = query_llm(features_prompt)
        
        # 5. Get architecture details
        architecture_prompt = f"For a software project described as: '{description}', recommend an architecture approach. Include a description and list of components. Return as JSON."
        architecture_data = query_llm(architecture_prompt)
        
        # 6. Get testing strategy
        testing_prompt = f"For a software project described as: '{description}', recommend a testing strategy and types of tests to implement. Return as JSON."
        testing_data = query_llm(testing_prompt)
        
        # 7. Get deployment plan
        deployment_prompt = f"For a software project described as: '{description}', recommend a deployment strategy and environments. Return as JSON."
        deployment_data = query_llm(deployment_prompt)
        
        # Combine all data into a single comprehensive response
        complete_data = {
            "project_name": overview_data.get("project_name", "New Project"),
            "description": overview_data.get("description", description),
            "tech_stack": tech_stack_data.get("tech_stack", {}),
            "phases": phases_data.get("phases", []),
            "features": features_data.get("features", []),
            "architecture": architecture_data.get("architecture", {}),
            "testing": testing_data.get("testing", {}),
            "deployment": deployment_data.get("deployment", {})
        }
        
        # Apply fallback values to ensure dashboard isn't empty
        return apply_fallback_values(complete_data, description)
    except Exception as e:
        print(f"Error in LLM generation: {str(e)}")
        # Return fallback values if LLM generation fails
        return generate_fallback_dashboard(description)

def apply_fallback_values(data, description):
    """Add fallback/default values for any missing data points"""
    
    # Project name and description
    if not data.get("project_name"):
        data["project_name"] = "ResourceXchange Project"
    if not data.get("description"):
        data["description"] = description or "A modern software application to exchange and manage resources efficiently."
    
    # Tech stack
    if not data.get("tech_stack") or not data["tech_stack"]:
        data["tech_stack"] = {
            "frontend": ["React", "TypeScript", "Tailwind CSS"],
            "backend": ["Node.js", "Express", "Python"],
            "database": ["MongoDB", "Redis"],
            "devops": ["Docker", "GitHub Actions", "AWS"]
        }
    else:
        # Fill in any missing tech stack categories
        for category in ["frontend", "backend", "database", "devops"]:
            if category not in data["tech_stack"] or not data["tech_stack"][category]:
                data["tech_stack"][category] = get_default_tech(category)
    
    # Map tech stack items to match available icons where possible
    for category in ["frontend", "backend", "database", "devops"]:
        if category in data["tech_stack"] and data["tech_stack"][category]:
            mapped_tech = []
            for tech in data["tech_stack"][category]:
                # Check if we need to normalize the name
                tech_key = tech.lower().replace(" ", "").replace(".", "").replace("-", "")
                
                # Common name mappings to match our icon set
                name_mappings = {
                    "node": "Node.js",
                    "nodejs": "Node.js",
                    "reactjs": "React",
                    "react.js": "React",
                    "vuejs": "Vue.js",
                    "vue": "Vue.js",
                    "angularjs": "Angular",
                    "angular2+": "Angular",
                    "postgres": "PostgreSQL",
                    "postgresql": "PostgreSQL",
                    "mongo": "MongoDB",
                    "mongodb": "MongoDB",
                    "tailwindcss": "Tailwind CSS",
                    "tailwind": "Tailwind CSS",
                    "golang": "Go",
                    "dotnetcore": ".NET Core",
                    "dotnet": ".NET",
                    "expressjs": "Express",
                }
                
                # Use the mapped name if available
                if tech_key in name_mappings:
                    mapped_tech.append(name_mappings[tech_key])
                else:
                    mapped_tech.append(tech)
            
            data["tech_stack"][category] = mapped_tech
    
    # Development phases
    if not data.get("phases") or not data["phases"]:
        data["phases"] = [
            {
                "name": "Planning & Requirements",
                "duration": "2 weeks",
                "description": "Define project requirements, user stories, and technical specifications.",
                "tasks": [
                    {"name": "Stakeholder Interviews", "description": "Gather requirements from key stakeholders", "priority": "High"},
                    {"name": "User Stories", "description": "Create detailed user stories", "priority": "High"},
                    {"name": "Technical Specifications", "description": "Define technical architecture and specifications", "priority": "Medium"},
                    {"name": "Project Timeline", "description": "Create project timeline and milestones", "priority": "Medium"}
                ]
            },
            {
                "name": "Design & Prototyping",
                "duration": "3 weeks",
                "description": "Create UI/UX designs and interactive prototypes for approval.",
                "tasks": [
                    {"name": "Wireframing", "description": "Create wireframes for key screens", "priority": "High"},
                    {"name": "UI/UX Design", "description": "Create detailed UI designs", "priority": "High"},
                    {"name": "Prototype Testing", "description": "Test prototypes with sample users", "priority": "Medium"},
                    {"name": "Design Review", "description": "Review and finalize designs", "priority": "Medium"}
                ]
            },
            {
                "name": "Development",
                "duration": "8 weeks",
                "description": "Implement the core functionality and features of the application.",
                "tasks": [
                    {"name": "Frontend Development", "description": "Implement UI components and interfaces", "priority": "High"},
                    {"name": "Backend Development", "description": "Implement APIs and business logic", "priority": "High"},
                    {"name": "Database Integration", "description": "Implement data models and integrations", "priority": "High"},
                    {"name": "Authentication System", "description": "Implement user authentication and authorization", "priority": "Medium"},
                    {"name": "API Integration", "description": "Integrate with third-party services", "priority": "Medium"}
                ]
            },
            {
                "name": "Testing & QA",
                "duration": "3 weeks",
                "description": "Perform comprehensive testing to ensure application quality.",
                "tasks": [
                    {"name": "Unit Testing", "description": "Write and run unit tests", "priority": "High"},
                    {"name": "Integration Testing", "description": "Test component integrations", "priority": "High"},
                    {"name": "User Acceptance Testing", "description": "Conduct UAT with stakeholders", "priority": "Medium"},
                    {"name": "Performance Testing", "description": "Test application performance under load", "priority": "Medium"}
                ]
            },
            {
                "name": "Deployment & Launch",
                "duration": "2 weeks",
                "description": "Deploy the application to production and launch.",
                "tasks": [
                    {"name": "Production Deployment", "description": "Deploy to production environment", "priority": "High"},
                    {"name": "Monitoring Setup", "description": "Set up monitoring and alerting", "priority": "High"},
                    {"name": "User Documentation", "description": "Create user documentation", "priority": "Medium"},
                    {"name": "Launch Marketing", "description": "Coordinate with marketing for launch", "priority": "Low"}
                ]
            }
        ]
    
    # Features
    if not data.get("features") or not data["features"]:
        data["features"] = [
            {"name": "User Authentication", "description": "Secure user registration and authentication system", "priority": "High"},
            {"name": "Resource Management", "description": "Create, update, delete and browse resources", "priority": "High"},
            {"name": "Search Functionality", "description": "Powerful search with filters and sorting options", "priority": "High"},
            {"name": "User Dashboard", "description": "Personalized dashboard showing user activity and resources", "priority": "Medium"},
            {"name": "Notifications", "description": "Real-time notifications for resource updates and messages", "priority": "Medium"},
            {"name": "Analytics", "description": "Usage statistics and performance metrics", "priority": "Low"}
        ]
    
    # Architecture
    if not data.get("architecture") or not data["architecture"]:
        data["architecture"] = {
            "description": "A modern microservices architecture with a responsive frontend and scalable backend services.",
            "components": [
                "Frontend SPA (Single Page Application)",
                "RESTful API Gateway",
                "Authentication Service",
                "Resource Management Service",
                "Notification Service",
                "Database Layer",
                "Caching Layer",
                "File Storage Service"
            ]
        }
    elif not data["architecture"].get("components") or not data["architecture"]["components"]:
        data["architecture"]["components"] = [
            "Frontend Application",
            "Backend API",
            "Database Layer",
            "Authentication Service",
            "Storage Service"
        ]
    
    # Testing
    if not data.get("testing") or not data["testing"]:
        data["testing"] = {
            "strategy": "A comprehensive testing strategy with multiple testing levels to ensure application quality and reliability.",
            "types": [
                "Unit Testing",
                "Integration Testing",
                "End-to-End Testing",
                "User Acceptance Testing",
                "Performance Testing",
                "Security Testing"
            ]
        }
    elif not data["testing"].get("types") or not data["testing"]["types"]:
        data["testing"]["types"] = [
            "Unit Testing",
            "Integration Testing",
            "End-to-End Testing",
            "User Acceptance Testing"
        ]
    
    # Deployment
    if not data.get("deployment") or not data["deployment"]:
        data["deployment"] = {
            "strategy": "A CI/CD pipeline with automated testing and deployment to ensure reliable and frequent releases.",
            "environments": [
                "Development",
                "Staging",
                "Production"
            ]
        }
    elif not data["deployment"].get("environments") or not data["deployment"]["environments"]:
        data["deployment"]["environments"] = [
            "Development",
            "Staging",
            "Production"
        ]
    
    return data

def get_default_tech(category):
    """Get default technologies for a specific category"""
    defaults = {
        "frontend": ["React", "TypeScript", "Tailwind CSS"],
        "backend": ["Node.js", "Express", "Python"],
        "database": ["MongoDB", "Redis"],
        "devops": ["Docker", "GitHub Actions", "AWS"]
    }
    return defaults.get(category, ["Technology 1", "Technology 2"])

def get_random_tech_stack():
    """Generate a random tech stack with variations"""
    frontend_options = [
        ["React", "TypeScript", "Tailwind CSS", "Next.js", "Redux"],
        ["Vue.js", "JavaScript", "Bootstrap", "Vuex", "Nuxt.js"],
        ["Angular", "TypeScript", "Material UI", "RxJS", "NgRx"],
        ["Svelte", "JavaScript", "Bulma", "SvelteKit", "Svelte Store"],
        ["Next.js", "TypeScript", "Styled Components", "Recoil", "SWR"]
    ]
    
    backend_options = [
        ["Node.js", "Express", "Python", "FastAPI", "GraphQL"],
        ["Django", "Python", "FastAPI", "Celery", "Django REST"],
        ["Spring Boot", "Java", "Kotlin", "Spring Cloud", "Spring Security"],
        ["Laravel", "PHP", "Symfony", "Lumen", "PHPUnit"],
        ["Go", "Gin", "Rust", "Actix", "Tokio"]
    ]
    
    database_options = [
        ["MongoDB", "Redis", "Elasticsearch", "Neo4j", "Cassandra"],
        ["PostgreSQL", "MongoDB", "Redis", "TimescaleDB", "CockroachDB"],
        ["MySQL", "Redis", "InfluxDB", "ClickHouse", "Druid"],
        ["DynamoDB", "Elasticsearch", "Redshift", "Aurora", "DocumentDB"],
        ["Firebase", "Supabase", "FaunaDB", "Couchbase", "RethinkDB"]
    ]
    
    devops_options = [
        ["Docker", "GitHub Actions", "AWS", "Terraform", "Prometheus"],
        ["Kubernetes", "Jenkins", "GCP", "Helm", "Grafana"],
        ["Terraform", "CircleCI", "Azure", "Ansible", "ELK Stack"],
        ["Ansible", "GitLab CI", "DigitalOcean", "Pulumi", "Jaeger"],
        ["Prometheus", "Grafana", "Heroku", "ArgoCD", "Istio"]
    ]
    
    return {
        "frontend": random.choice(frontend_options),
        "backend": random.choice(backend_options),
        "database": random.choice(database_options),
        "devops": random.choice(devops_options)
    }

def get_random_metrics():
    """Generate random project metrics"""
    return {
        "code_coverage": random.randint(70, 95),
        "test_passing": random.randint(85, 100),
        "build_success": random.randint(90, 100),
        "deployment_frequency": random.randint(1, 10),
        "lead_time": random.randint(1, 7),
        "incident_resolution": random.randint(1, 24),
        "active_users": random.randint(1000, 10000),
        "api_requests": random.randint(10000, 100000),
        "error_rate": round(random.uniform(0.1, 2.0), 2),
        "response_time": round(random.uniform(100, 500), 2)
    }

def get_random_activity():
    """Generate random development activity data"""
    activities = [
        "Code Review",
        "Bug Fix",
        "Feature Development",
        "Testing",
        "Documentation",
        "Deployment",
        "Infrastructure",
        "Security",
        "Performance",
        "Refactoring"
    ]
    
    return {
        "activities": random.sample(activities, random.randint(3, 7)),
        "commits": random.randint(5, 50),
        "pull_requests": random.randint(2, 15),
        "issues_closed": random.randint(3, 20),
        "new_issues": random.randint(1, 10),
        "code_reviews": random.randint(2, 12),
        "deployments": random.randint(1, 5)
    }

def get_random_timeline_data():
    """Generate random timeline data for the last 7 days"""
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return {
        "commits": [random.randint(0, 20) for _ in range(7)],
        "issues": [random.randint(0, 10) for _ in range(7)],
        "pull_requests": [random.randint(0, 8) for _ in range(7)],
        "deployments": [random.randint(0, 3) for _ in range(7)],
        "days": days
    }

def get_random_phases():
    """Generate random development phases with variations"""
    phase_templates = [
        {
            "name": "Planning & Requirements",
            "duration": f"{random.randint(1, 3)} weeks",
            "description": "Define project requirements, user stories, and technical specifications.",
            "tasks": [
                {"name": "Stakeholder Interviews", "description": "Gather requirements from key stakeholders", "priority": "High"},
                {"name": "User Stories", "description": "Create detailed user stories", "priority": "High"},
                {"name": "Technical Specifications", "description": "Define technical architecture and specifications", "priority": "Medium"},
                {"name": "Project Timeline", "description": "Create project timeline and milestones", "priority": "Medium"}
            ]
        },
        {
            "name": "Design & Prototyping",
            "duration": f"{random.randint(2, 4)} weeks",
            "description": "Create UI/UX designs and interactive prototypes for approval.",
            "tasks": [
                {"name": "Wireframing", "description": "Create wireframes for key screens", "priority": "High"},
                {"name": "UI/UX Design", "description": "Create detailed UI designs", "priority": "High"},
                {"name": "Prototype Testing", "description": "Test prototypes with sample users", "priority": "Medium"},
                {"name": "Design Review", "description": "Review and finalize designs", "priority": "Medium"}
            ]
        },
        {
            "name": "Development",
            "duration": f"{random.randint(6, 10)} weeks",
            "description": "Implement the core functionality and features of the application.",
            "tasks": [
                {"name": "Frontend Development", "description": "Implement UI components and interfaces", "priority": "High"},
                {"name": "Backend Development", "description": "Implement APIs and business logic", "priority": "High"},
                {"name": "Database Integration", "description": "Implement data models and integrations", "priority": "High"},
                {"name": "Authentication System", "description": "Implement user authentication and authorization", "priority": "Medium"},
                {"name": "API Integration", "description": "Integrate with third-party services", "priority": "Medium"}
            ]
        },
        {
            "name": "Testing & QA",
            "duration": f"{random.randint(2, 4)} weeks",
            "description": "Perform comprehensive testing to ensure application quality.",
            "tasks": [
                {"name": "Unit Testing", "description": "Write and run unit tests", "priority": "High"},
                {"name": "Integration Testing", "description": "Test component integrations", "priority": "High"},
                {"name": "User Acceptance Testing", "description": "Conduct UAT with stakeholders", "priority": "Medium"},
                {"name": "Performance Testing", "description": "Test application performance under load", "priority": "Medium"}
            ]
        },
        {
            "name": "Deployment & Launch",
            "duration": f"{random.randint(1, 3)} weeks",
            "description": "Deploy the application to production and launch.",
            "tasks": [
                {"name": "Production Deployment", "description": "Deploy to production environment", "priority": "High"},
                {"name": "Monitoring Setup", "description": "Set up monitoring and alerting", "priority": "High"},
                {"name": "User Documentation", "description": "Create user documentation", "priority": "Medium"},
                {"name": "Launch Marketing", "description": "Coordinate with marketing for launch", "priority": "Low"}
            ]
        }
    ]
    
    # Randomly select 4-5 phases
    num_phases = random.randint(4, 5)
    return random.sample(phase_templates, num_phases)

def get_random_features():
    """Generate random features with variations"""
    feature_templates = [
        {"name": "User Authentication", "description": "Secure user registration and authentication system", "priority": "High"},
        {"name": "Resource Management", "description": "Create, update, delete and browse resources", "priority": "High"},
        {"name": "Search Functionality", "description": "Powerful search with filters and sorting options", "priority": "High"},
        {"name": "User Dashboard", "description": "Personalized dashboard showing user activity and resources", "priority": "Medium"},
        {"name": "Notifications", "description": "Real-time notifications for resource updates and messages", "priority": "Medium"},
        {"name": "Analytics", "description": "Usage statistics and performance metrics", "priority": "Low"},
        {"name": "Social Integration", "description": "Share and collaborate with other users", "priority": "Medium"},
        {"name": "Mobile Responsiveness", "description": "Optimized experience for mobile devices", "priority": "High"},
        {"name": "API Documentation", "description": "Comprehensive API documentation and examples", "priority": "Medium"},
        {"name": "Data Export", "description": "Export data in various formats", "priority": "Low"}
    ]
    
    # Randomly select 5-7 features
    num_features = random.randint(5, 7)
    return random.sample(feature_templates, num_features)

def get_random_architecture():
    """Generate random architecture with variations"""
    architecture_templates = [
        {
            "description": "A modern microservices architecture with a responsive frontend and scalable backend services.",
            "components": [
                "Frontend SPA (Single Page Application)",
                "RESTful API Gateway",
                "Authentication Service",
                "Resource Management Service",
                "Notification Service",
                "Database Layer",
                "Caching Layer",
                "File Storage Service"
            ]
        },
        {
            "description": "A serverless architecture leveraging cloud functions and managed services for scalability.",
            "components": [
                "Frontend Application",
                "API Gateway",
                "Lambda Functions",
                "DynamoDB",
                "S3 Storage",
                "CloudFront CDN",
                "Cognito Authentication",
                "CloudWatch Monitoring"
            ]
        },
        {
            "description": "A monolithic architecture with a modular design for maintainability and scalability.",
            "components": [
                "Web Application",
                "API Layer",
                "Business Logic Layer",
                "Data Access Layer",
                "Database",
                "Caching System",
                "File Storage",
                "Background Jobs"
            ]
        }
    ]
    
    return random.choice(architecture_templates)

def get_random_testing():
    """Generate random testing strategy with variations"""
    testing_templates = [
        {
            "strategy": "A comprehensive testing strategy with multiple testing levels to ensure application quality and reliability.",
            "types": [
                "Unit Testing",
                "Integration Testing",
                "End-to-End Testing",
                "User Acceptance Testing",
                "Performance Testing",
                "Security Testing"
            ]
        },
        {
            "strategy": "A test-driven development approach with continuous integration and automated testing.",
            "types": [
                "TDD Unit Tests",
                "API Testing",
                "UI Testing",
                "Database Testing",
                "Load Testing",
                "Security Scanning"
            ]
        },
        {
            "strategy": "A behavior-driven development approach focusing on user stories and acceptance criteria.",
            "types": [
                "BDD Tests",
                "Feature Testing",
                "Integration Testing",
                "Performance Testing",
                "Accessibility Testing",
                "Compliance Testing"
            ]
        }
    ]
    
    return random.choice(testing_templates)

def get_random_deployment():
    """Generate random deployment plan with variations"""
    deployment_templates = [
        {
            "strategy": "A CI/CD pipeline with automated testing and deployment to ensure reliable and frequent releases.",
            "environments": [
                "Development",
                "Staging",
                "Production"
            ]
        },
        {
            "strategy": "A blue-green deployment strategy with automated rollback capabilities for zero-downtime updates.",
            "environments": [
                "Development",
                "QA",
                "Staging",
                "Production"
            ]
        },
        {
            "strategy": "A canary deployment approach with gradual rollout and monitoring for safe updates.",
            "environments": [
                "Development",
                "Testing",
                "Staging",
                "Canary",
                "Production"
            ]
        }
    ]
    
    return random.choice(deployment_templates)

def generate_fallback_dashboard(description):
    """Generate a completely default dashboard with random variations"""
    project_name = "ResourceXchange Project"
    if description:
        # Try to extract a reasonable project name from the description
        words = description.split()
        if len(words) >= 2:
            project_name = " ".join([word.capitalize() for word in words[:2]]) + " Project"
    
    dashboard_data = {
        "project_name": project_name,
        "description": description or "A modern software application to exchange and manage resources efficiently.",
        "tech_stack": get_random_tech_stack(),
        "phases": get_random_phases(),
        "features": get_random_features(),
        "architecture": get_random_architecture(),
        "testing": get_random_testing(),
        "deployment": get_random_deployment()
    }
    
    return dashboard_data

# HTML template for the advanced dashboard
ADVANCED_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Project Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background: #0a0a0a;
            color: #ffffff;
        }
        .dashboard-card {
            background: rgba(17, 17, 17, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        .dashboard-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }
        .gradient-text {
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .tech-icon {
            width: 32px;
            height: 32px;
            transition: transform 0.3s ease;
        }
        .tech-icon:hover {
            transform: scale(1.2);
        }
        .progress-ring {
            transform: rotate(-90deg);
        }
        .progress-ring__circle {
            transition: stroke-dashoffset 0.3s ease;
        }
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
        .glass-effect {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body class="min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <header class="mb-12 text-center">
            <h1 class="text-4xl font-bold mb-4 gradient-text">Advanced Project Dashboard</h1>
            <p class="text-gray-400">Generate comprehensive project insights and visualizations</p>
        </header>

        <!-- Project Input Form -->
        <div class="dashboard-card p-8 mb-12">
            <form id="projectForm" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Project Description</label>
                    <textarea id="projectDescription" rows="4" 
                        class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Describe your project, its goals, and key requirements..."></textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Team Size</label>
                        <select id="teamSize" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg">
                            <option value="small">Small (1-5)</option>
                            <option value="medium">Medium (6-15)</option>
                            <option value="large">Large (16+)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Timeline</label>
                        <select id="timeline" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg">
                            <option value="short">Short (1-3 months)</option>
                            <option value="medium">Medium (3-6 months)</option>
                            <option value="long">Long (6+ months)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Complexity</label>
                        <select id="complexity" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>

                <button type="submit" 
                    class="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all">
                    Generate Dashboard
                </button>
            </form>
        </div>

        <!-- Loading State -->
        <div id="loading" class="hidden text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p class="mt-4 text-gray-400">Generating your advanced dashboard...</p>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboard" class="hidden space-y-8">
            <!-- Project Overview -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Project Overview</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="text-xl font-semibold mb-4">Project Summary</h3>
                        <div id="project-summary" class="prose prose-invert"></div>
                    </div>
                    <div>
                        <h3 class="text-xl font-semibold mb-4">Project Visualization</h3>
                        <div id="project-visualization" class="rounded-lg overflow-hidden">
                            <img id="project-image" class="w-full h-64 object-cover" src="" alt="Project Visualization">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tech Stack -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Technology Stack</h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Frontend</h3>
                        <div id="frontend-tech" class="space-y-3"></div>
                    </div>
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Backend</h3>
                        <div id="backend-tech" class="space-y-3"></div>
                    </div>
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Database</h3>
                        <div id="database-tech" class="space-y-3"></div>
                    </div>
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">DevOps</h3>
                        <div id="devops-tech" class="space-y-3"></div>
                    </div>
                </div>
            </div>

            <!-- Development Timeline -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Development Timeline</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="text-xl font-semibold mb-4">Timeline Overview</h3>
                        <div id="timeline-chart" class="h-64"></div>
                    </div>
                    <div>
                        <h3 class="text-xl font-semibold mb-4">Phase Distribution</h3>
                        <div id="phase-distribution" class="h-64"></div>
                    </div>
                </div>
            </div>

            <!-- Development Phases -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Development Phases</h2>
                <div id="phases" class="space-y-6"></div>
            </div>

            <!-- Real-time Metrics -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Real-time Metrics</h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Code Quality</h3>
                        <div class="flex items-center justify-center">
                            <div class="relative w-32 h-32">
                                <svg class="w-full h-full">
                                    <circle class="text-gray-700" stroke-width="8" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                    <circle class="text-blue-500 progress-ring__circle" stroke-width="8" stroke-linecap="round" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span id="code-quality" class="text-2xl font-bold">0%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Test Coverage</h3>
                        <div class="flex items-center justify-center">
                            <div class="relative w-32 h-32">
                                <svg class="w-full h-full">
                                    <circle class="text-gray-700" stroke-width="8" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                    <circle class="text-green-500 progress-ring__circle" stroke-width="8" stroke-linecap="round" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span id="test-coverage" class="text-2xl font-bold">0%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Build Success</h3>
                        <div class="flex items-center justify-center">
                            <div class="relative w-32 h-32">
                                <svg class="w-full h-full">
                                    <circle class="text-gray-700" stroke-width="8" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                    <circle class="text-purple-500 progress-ring__circle" stroke-width="8" stroke-linecap="round" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span id="build-success" class="text-2xl font-bold">0%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="glass-effect p-6 rounded-lg">
                        <h3 class="text-lg font-semibold mb-4">Deployment Frequency</h3>
                        <div class="flex items-center justify-center">
                            <div class="relative w-32 h-32">
                                <svg class="w-full h-full">
                                    <circle class="text-gray-700" stroke-width="8" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                    <circle class="text-yellow-500 progress-ring__circle" stroke-width="8" stroke-linecap="round" stroke="currentColor" fill="transparent" r="52" cx="64" cy="64"/>
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span id="deployment-freq" class="text-2xl font-bold">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Activity Timeline -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Activity Timeline</h2>
                <div id="activity-timeline" class="h-96"></div>
            </div>

            <!-- Risk Assessment -->
            <div class="dashboard-card p-8">
                <h2 class="text-2xl font-bold mb-6 gradient-text">Risk Assessment</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="text-xl font-semibold mb-4">Risk Matrix</h3>
                        <div id="risk-matrix" class="h-64"></div>
                    </div>
                    <div>
                        <h3 class="text-xl font-semibold mb-4">Risk Details</h3>
                        <div id="risk-details" class="space-y-4"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize charts
        let timelineChart, phaseChart, activityChart, riskMatrix;
        
        // Function to update progress rings
        function updateProgressRing(elementId, value) {
            const circle = document.querySelector(`#${elementId} + svg circle.progress-ring__circle`);
            const radius = circle.r.baseVal.value;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (value / 100) * circumference;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }
        
        // Function to update metrics
        function updateMetrics() {
            fetch('/metrics')
                .then(response => response.json())
                .then(data => {
                    updateProgressRing('code-quality', data.code_quality);
                    updateProgressRing('test-coverage', data.test_coverage);
                    updateProgressRing('build-success', data.build_success);
                    updateProgressRing('deployment-freq', data.deployment_frequency);
                    
                    document.getElementById('code-quality').textContent = `${data.code_quality}%`;
                    document.getElementById('test-coverage').textContent = `${data.test_coverage}%`;
                    document.getElementById('build-success').textContent = `${data.build_success}%`;
                    document.getElementById('deployment-freq').textContent = data.deployment_frequency;
                });
        }
        
        // Function to update activity
        function updateActivity() {
            fetch('/activity')
                .then(response => response.json())
                .then(data => {
                    updateActivityChart(data);
                });
        }
        
        // Function to update activity chart
        function updateActivityChart(data) {
            const options = {
                series: [{
                    name: 'Commits',
                    data: data.commits
                }, {
                    name: 'Issues',
                    data: data.issues
                }, {
                    name: 'Pull Requests',
                    data: data.pull_requests
                }, {
                    name: 'Deployments',
                    data: data.deployments
                }],
                chart: {
                    type: 'area',
                    height: 350,
                    toolbar: {
                        show: false
                    },
                    background: 'transparent'
                },
                dataLabels: {
                    enabled: false
                },
                stroke: {
                    curve: 'smooth',
                    width: 2
                },
                xaxis: {
                    categories: data.days,
                    labels: {
                        style: {
                            colors: '#ffffff'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: '#ffffff'
                        }
                    }
                },
                tooltip: {
                    theme: 'dark'
                },
                grid: {
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                colors: ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6']
            };
            
            if (activityChart) {
                activityChart.updateOptions(options);
            } else {
                activityChart = new ApexCharts(document.querySelector("#activity-timeline"), options);
                activityChart.render();
            }
        }
        
        // Form submission
        document.getElementById('projectForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const projectDescription = document.getElementById('projectDescription').value;
            const teamSize = document.getElementById('teamSize').value;
            const timeline = document.getElementById('timeline').value;
            const complexity = document.getElementById('complexity').value;
            
            if (!projectDescription) {
                alert('Please enter a project description');
                return;
            }
            
            // Show loading
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('hidden');
            
            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        projectDescription,
                        teamSize,
                        timeline,
                        complexity
                    }),
                });
                
                const data = await response.json();
                
                if (data.error) {
                    alert('Error: ' + data.error);
                    document.getElementById('loading').classList.add('hidden');
                    return;
                }
                
                renderDashboard(data);
                
                // Hide loading, show dashboard
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
                
                // Start real-time updates
                setInterval(() => {
                    updateMetrics();
                    updateActivity();
                }, 5000);
                
                // Initial updates
                updateMetrics();
                updateActivity();
                
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
                document.getElementById('loading').classList.add('hidden');
            }
        });
        
        function renderDashboard(data) {
            // Project Summary
            document.getElementById('project-summary').innerHTML = data.summary;
            
            // Project Visualization
            document.getElementById('project-image').src = data.visualization;
            
            // Tech Stack
            renderTechStack(data.techStack);
            
            // Timeline Chart
            renderTimelineChart(data.phases);
            
            // Phase Distribution
            renderPhaseDistribution(data.phases);
            
            // Development Phases
            renderPhases(data.phases);
            
            // Risk Assessment
            renderRiskAssessment(data.risks);
        }
        
        function renderTechStack(techStack) {
            const categories = ['frontend', 'backend', 'database', 'devops'];
            categories.forEach(category => {
                const container = document.getElementById(`${category}-tech`);
                container.innerHTML = '';
                
                techStack[category].forEach(tech => {
                    const div = document.createElement('div');
                    div.className = 'flex items-center space-x-3';
                    div.innerHTML = `
                        <img src="${tech.icon}" alt="${tech.name}" class="tech-icon">
                        <span>${tech.name}</span>
                    `;
                    container.appendChild(div);
                });
            });
        }
        
        function renderTimelineChart(phases) {
            const options = {
                series: [{
                    name: 'Duration',
                    data: phases.map(phase => phase.duration)
                }],
                chart: {
                    type: 'bar',
                    height: 350,
                    toolbar: {
                        show: false
                    },
                    background: 'transparent'
                },
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        horizontal: true,
                    }
                },
                dataLabels: {
                    enabled: false
                },
                xaxis: {
                    categories: phases.map(phase => phase.name),
                    labels: {
                        style: {
                            colors: '#ffffff'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: '#ffffff'
                        }
                    }
                },
                grid: {
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                colors: ['#3b82f6']
            };
            
            if (timelineChart) {
                timelineChart.updateOptions(options);
            } else {
                timelineChart = new ApexCharts(document.querySelector("#timeline-chart"), options);
                timelineChart.render();
            }
        }
        
        function renderPhaseDistribution(phases) {
            const options = {
                series: phases.map(phase => phase.duration),
                chart: {
                    type: 'donut',
                    height: 350,
                    background: 'transparent'
                },
                labels: phases.map(phase => phase.name),
                colors: ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'],
                legend: {
                    labels: {
                        colors: '#ffffff'
                    }
                }
            };
            
            if (phaseChart) {
                phaseChart.updateOptions(options);
            } else {
                phaseChart = new ApexCharts(document.querySelector("#phase-distribution"), options);
                phaseChart.render();
            }
        }
        
        function renderPhases(phases) {
            const container = document.getElementById('phases');
            container.innerHTML = '';
            
            phases.forEach((phase, index) => {
                const div = document.createElement('div');
                div.className = 'glass-effect p-6 rounded-lg';
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold">${index + 1}. ${phase.name}</h3>
                        <span class="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-300 rounded-full">${phase.duration} weeks</span>
                    </div>
                    <p class="text-gray-300 mb-4">${phase.description}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-medium mb-2">Key Tasks</h4>
                            <ul class="space-y-2">
                                ${phase.tasks.map(task => `
                                    <li class="flex items-center space-x-2">
                                        <i class="fas fa-check-circle text-green-500"></i>
                                        <span>${task}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-medium mb-2">Deliverables</h4>
                            <ul class="space-y-2">
                                ${phase.deliverables.map(deliverable => `
                                    <li class="flex items-center space-x-2">
                                        <i class="fas fa-file-alt text-blue-500"></i>
                                        <span>${deliverable}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }
        
        function renderRiskAssessment(risks) {
            const container = document.getElementById('risk-details');
            container.innerHTML = '';
            
            risks.forEach(risk => {
                const div = document.createElement('div');
                div.className = 'glass-effect p-4 rounded-lg';
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-medium">${risk.name}</h4>
                        <span class="px-2 py-1 rounded-full ${
                            risk.level === 'High' ? 'bg-red-500 bg-opacity-20 text-red-300' :
                            risk.level === 'Medium' ? 'bg-yellow-500 bg-opacity-20 text-yellow-300' :
                            'bg-green-500 bg-opacity-20 text-green-300'
                        }">${risk.level}</span>
                    </div>
                    <p class="text-gray-300 text-sm">${risk.mitigation}</p>
                `;
                container.appendChild(div);
            });
            
            // Risk Matrix
            const riskMatrixOptions = {
                series: [{
                    name: 'Risk Impact',
                    data: risks.map(risk => risk.impact)
                }],
                chart: {
                    type: 'scatter',
                    height: 350,
                    background: 'transparent'
                },
                xaxis: {
                    title: {
                        text: 'Probability',
                        style: {
                            color: '#ffffff'
                        }
                    },
                    labels: {
                        style: {
                            colors: '#ffffff'
                        }
                    }
                },
                yaxis: {
                    title: {
                        text: 'Impact',
                        style: {
                            color: '#ffffff'
                        }
                    },
                    labels: {
                        style: {
                            colors: '#ffffff'
                        }
                    }
                },
                grid: {
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }
            };
            
            if (riskMatrix) {
                riskMatrix.updateOptions(riskMatrixOptions);
            } else {
                riskMatrix = new ApexCharts(document.querySelector("#risk-matrix"), riskMatrixOptions);
                riskMatrix.render();
            }
        }
    </script>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(ADVANCED_TEMPLATE)

@app.route('/generate', methods=['POST'])
def generate_dashboard():
    try:
        data = request.json
        project_description = data.get('projectDescription', '')
        team_size = data.get('teamSize', 'medium')
        timeline = data.get('timeline', 'medium')
        complexity = data.get('complexity', 'medium')
        
        if not project_description:
            return jsonify({'error': 'Project description is required'}), 400
            
        # Generate dashboard data
        dashboard_data = generate_advanced_dashboard(project_description, team_size, timeline, complexity)
        return jsonify(dashboard_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_advanced_dashboard(project_description, team_size, timeline, complexity):
    """Generate advanced dashboard data with synthetic metrics and visualizations"""
    
    # Generate project visualization
    visualization = generate_project_visualization(project_description)
    
    # Generate tech stack
    tech_stack = generate_tech_stack(team_size, complexity)
    
    # Generate development phases
    phases = generate_development_phases(timeline, complexity)
    
    # Generate risk assessment
    risks = generate_risk_assessment(complexity)
    
    # Generate project summary
    summary = generate_project_summary(project_description, team_size, timeline, complexity)
    
    return {
        "summary": summary,
        "visualization": visualization,
        "techStack": tech_stack,
        "phases": phases,
        "risks": risks
    }

def generate_project_visualization(description):
    """Generate a dynamic project visualization image with varying elements"""
    # Create a larger image with more elements
    img = Image.new('RGB', (1200, 600), color=(17, 17, 17))
    d = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("Arial", 60)
        small_font = ImageFont.truetype("Arial", 30)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Extract project name from description
    project_name = description.split()[0] if description else "Project"
    
    # Draw project name with gradient effect
    for i in range(5):
        d.text((600, 200), project_name, fill=(255-i*50, 255-i*50, 255-i*50), font=font, anchor="mm")
    
    # Add random tech stack visualization
    tech_icons = ["⚡", "🔧", "🔨", "💻", "📱", "🌐", "🔒", "📊"]
    for i in range(8):
        x = random.randint(100, 1100)
        y = random.randint(300, 500)
        size = random.randint(20, 40)
        d.text((x, y), random.choice(tech_icons), fill=(random.randint(100, 255), random.randint(100, 255), random.randint(100, 255)), font=small_font)
    
    # Add random connection lines
    for _ in range(15):
        x1 = random.randint(100, 1100)
        y1 = random.randint(300, 500)
        x2 = random.randint(100, 1100)
        y2 = random.randint(300, 500)
        d.line([(x1, y1), (x2, y2)], fill=(random.randint(50, 150), random.randint(50, 150), random.randint(50, 150)), width=2)
    
    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

def generate_tech_stack(team_size, complexity):
    """Generate a tech stack based on team size and complexity"""
    frontend_options = [
        {"name": "React", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"},
        {"name": "TypeScript", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg"},
        {"name": "Next.js", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg"},
        {"name": "Tailwind CSS", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg"},
        {"name": "Redux", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redux/redux-original.svg"}
    ]
    
    backend_options = [
        {"name": "Node.js", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg"},
        {"name": "Python", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"},
        {"name": "FastAPI", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"},
        {"name": "GraphQL", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/graphql/graphql-plain.svg"},
        {"name": "Express", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg"}
    ]
    
    database_options = [
        {"name": "MongoDB", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg"},
        {"name": "PostgreSQL", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg"},
        {"name": "Redis", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg"},
        {"name": "Elasticsearch", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/elasticsearch/elasticsearch-original.svg"},
        {"name": "Neo4j", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/neo4j/neo4j-original.svg"}
    ]
    
    devops_options = [
        {"name": "Docker", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"},
        {"name": "Kubernetes", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg"},
        {"name": "AWS", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg"},
        {"name": "GitHub Actions", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg"},
        {"name": "Terraform", "icon": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg"}
    ]
    
    # Select technologies based on complexity
    num_techs = 3 if complexity == "low" else 4 if complexity == "medium" else 5
    
    return {
        "frontend": random.sample(frontend_options, num_techs),
        "backend": random.sample(backend_options, num_techs),
        "database": random.sample(database_options, num_techs),
        "devops": random.sample(devops_options, num_techs)
    }

def generate_development_phases(timeline, complexity):
    """Generate development phases based on timeline and complexity"""
    base_durations = {
        "short": [1, 2, 3, 2, 1],
        "medium": [2, 3, 6, 3, 2],
        "long": [3, 4, 8, 4, 3]
    }
    
    durations = base_durations[timeline]
    if complexity == "high":
        durations = [d * 1.5 for d in durations]
    elif complexity == "low":
        durations = [d * 0.75 for d in durations]
    
    phases = [
        {
            "name": "Planning & Requirements",
            "duration": round(durations[0]),
            "description": "Define project scope, gather requirements, and create initial backlog.",
            "tasks": [
                "Conduct stakeholder interviews",
                "Document functional requirements",
                "Create user stories",
                "Define MVP scope",
                "Create project charter"
            ],
            "deliverables": [
                "Project charter",
                "Requirements document",
                "Initial product backlog",
                "Risk assessment"
            ]
        },
        {
            "name": "Design & Architecture",
            "duration": round(durations[1]),
            "description": "Define system architecture, database schema, and create UI/UX designs.",
            "tasks": [
                "Create system architecture diagrams",
                "Design database schema",
                "Create wireframes",
                "Define API specifications",
                "Create design system"
            ],
            "deliverables": [
                "Architecture document",
                "Database schema",
                "UI/UX design prototypes",
                "API documentation",
                "Design system"
            ]
        },
        {
            "name": "Development",
            "duration": round(durations[2]),
            "description": "Implement features according to requirements and design specifications.",
            "tasks": [
                "Set up development environment",
                "Implement backend services",
                "Develop frontend components",
                "Integrate third-party services",
                "Conduct code reviews"
            ],
            "deliverables": [
                "Working code for all features",
                "Documentation",
                "Unit tests",
                "Integration tests"
            ]
        },
        {
            "name": "Testing & QA",
            "duration": round(durations[3]),
            "description": "Ensure the application meets quality standards and requirements.",
            "tasks": [
                "Perform unit testing",
                "Conduct integration testing",
                "Execute system testing",
                "Perform UAT",
                "Fix bugs and issues"
            ],
            "deliverables": [
                "Test plans and reports",
                "Bug reports",
                "QA sign-off",
                "Performance test results"
            ]
        },
        {
            "name": "Deployment & Launch",
            "duration": round(durations[4]),
            "description": "Deploy the application to production and establish maintenance procedures.",
            "tasks": [
                "Prepare production environment",
                "Create deployment pipeline",
                "Perform final testing",
                "Deploy to production",
                "Monitor performance"
            ],
            "deliverables": [
                "Deployment documentation",
                "Maintenance plan",
                "Monitoring setup",
                "Training materials"
            ]
        }
    ]
    
    return phases

def generate_risk_assessment(complexity):
    """Generate more dynamic risk assessment with varying impact and probability"""
    base_risks = [
        {
            "name": "Scope Creep",
            "level": "High",
            "impact": random.randint(7, 10),
            "probability": random.randint(6, 9),
            "mitigation": "Implement strict change management process with requirement prioritization",
            "status": random.choice(["Active", "Mitigated", "Monitoring"]),
            "last_updated": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
        },
        {
            "name": "Technical Challenges",
            "level": "Medium",
            "impact": random.randint(5, 8),
            "probability": random.randint(4, 7),
            "mitigation": "Conduct regular technical spikes and maintain contingency time",
            "status": random.choice(["Active", "Mitigated", "Monitoring"]),
            "last_updated": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
        },
        {
            "name": "Resource Constraints",
            "level": "Medium",
            "impact": random.randint(4, 7),
            "probability": random.randint(5, 8),
            "mitigation": "Implement resource leveling and maintain backup resources",
            "status": random.choice(["Active", "Mitigated", "Monitoring"]),
            "last_updated": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
        },
        {
            "name": "Integration Issues",
            "level": "Low",
            "impact": random.randint(3, 6),
            "probability": random.randint(2, 5),
            "mitigation": "Create detailed integration test plans and conduct early testing",
            "status": random.choice(["Active", "Mitigated", "Monitoring"]),
            "last_updated": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
        }
    ]
    
    if complexity == "high":
        base_risks.extend([
            {
                "name": "Security Vulnerabilities",
                "level": "High",
                "impact": random.randint(8, 10),
                "probability": random.randint(5, 8),
                "mitigation": "Implement security by design and regular security audits",
                "status": random.choice(["Active", "Mitigated", "Monitoring"]),
                "last_updated": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
            },
            {
                "name": "Performance Issues",
                "level": "Medium",
                "impact": random.randint(6, 9),
                "probability": random.randint(4, 7),
                "mitigation": "Conduct performance testing early and optimize critical paths",
                "status": random.choice(["Active", "Mitigated", "Monitoring"]),
                "last_updated": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
            }
        ])
    
    # Add trend indicators
    for risk in base_risks:
        risk["trend"] = random.choice(["increasing", "decreasing", "stable"])
        risk["velocity"] = random.uniform(0.1, 0.5)
        risk["last_impact"] = max(1, min(10, risk["impact"] + random.randint(-2, 2)))
        risk["last_probability"] = max(1, min(10, risk["probability"] + random.randint(-2, 2)))
    
    return base_risks

def generate_project_summary(description, team_size, timeline, complexity):
    """Generate a project summary based on the input parameters"""
    return f"""
    <p class="mb-4">This project involves creating a {description} with a {team_size} team over a {timeline} timeline. 
    The project is of {complexity} complexity and will follow an agile development approach with regular client feedback 
    and iterative development cycles.</p>
    
    <p class="mb-4">The development process will be structured into clear phases, each with specific deliverables and 
    quality gates. The team will employ modern development practices including continuous integration, automated testing, 
    and regular code reviews to ensure high-quality deliverables.</p>
    
    <p>The project will leverage a carefully selected technology stack that balances performance, maintainability, and 
    scalability while meeting the specific requirements of the project.</p>
    """

@app.route('/metrics')
def get_metrics():
    """Generate more dynamic and realistic metrics"""
    # Generate base metrics with trends
    base_metrics = {
        "code_quality": random.randint(75, 95),
        "test_coverage": random.randint(80, 98),
        "build_success": random.randint(85, 100),
        "deployment_frequency": random.randint(1, 10),
        "lead_time": random.randint(1, 7),
        "incident_resolution": random.randint(1, 24),
        "active_users": random.randint(1000, 10000),
        "api_requests": random.randint(10000, 100000),
        "error_rate": round(random.uniform(0.1, 2.0), 2),
        "response_time": round(random.uniform(100, 500), 2)
    }
    
    # Add trend indicators
    trends = {}
    for metric in base_metrics:
        trend = random.choice(['up', 'down', 'stable'])
        value = base_metrics[metric]
        if trend == 'up':
            value = min(value + random.randint(1, 5), 100 if metric in ['code_quality', 'test_coverage', 'build_success'] else value * 1.2)
        elif trend == 'down':
            value = max(value - random.randint(1, 5), 0 if metric in ['code_quality', 'test_coverage', 'build_success'] else value * 0.8)
        trends[metric] = {
            'value': value,
            'trend': trend,
            'change': abs(value - base_metrics[metric])
        }
    
    return jsonify(trends)

@app.route('/activity')
def get_activity():
    """Generate more realistic activity data with patterns"""
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    # Generate base activity with weekly patterns
    base_commits = [random.randint(5, 15) for _ in range(7)]
    base_issues = [random.randint(2, 8) for _ in range(7)]
    base_prs = [random.randint(1, 5) for _ in range(7)]
    base_deployments = [random.randint(0, 2) for _ in range(7)]
    
    # Add daily variations
    commits = [max(0, x + random.randint(-3, 3)) for x in base_commits]
    issues = [max(0, x + random.randint(-2, 2)) for x in base_issues]
    prs = [max(0, x + random.randint(-1, 1)) for x in base_prs]
    deployments = [max(0, x + random.randint(-1, 1)) for x in base_deployments]
    
    # Add weekly patterns (more activity on weekdays)
    for i in range(7):
        if days[i] in ['Sat', 'Sun']:
            commits[i] = max(0, commits[i] - random.randint(2, 4))
            issues[i] = max(0, issues[i] - random.randint(1, 2))
            prs[i] = max(0, prs[i] - random.randint(0, 1))
            deployments[i] = max(0, deployments[i] - random.randint(0, 1))
    
    return jsonify({
        "commits": commits,
        "issues": issues,
        "pull_requests": prs,
        "deployments": deployments,
        "days": days,
        "patterns": {
            "weekday_activity": sum(commits[:5]) / 5,
            "weekend_activity": sum(commits[5:]) / 2,
            "average_daily_commits": sum(commits) / 7,
            "busiest_day": days[commits.index(max(commits))]
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=3000)
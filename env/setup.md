# Local Lab Setup

This lab runs intentionally vulnerable applications locally only for learning and testing purposes.
No external systems are targeted.

## Requirements
- Git (for version control)
- Docker Desktop (for running disposable local services)

## Running the lab

From the repository root:

    docker compose -f env/docker-compose.yml up -d

Then open:
http://localhost:3000

## Resetting the lab

To stop and remove the container:

    docker compose -f env/docker-compose.yml down

To start fresh:

    docker compose -f env/docker-compose.yml up -d

## Safety and scope notes
- Targets run only on localhost
- No scanning or testing of external systems
- Containers are disposable and can be removed at any time
- This repository is for learning and demonstration only
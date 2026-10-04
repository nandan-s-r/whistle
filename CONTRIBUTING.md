# Contributing to VC Scope OS

First off, thank you for considering contributing to VC Scope OS. It's people like you that make VC Scope OS such a great tool for the Venture Capital community.

## Development Setup

1. **Fork and clone** the repo
2. **Backend**: 
   - `python -m venv venv`
   - `pip install -r requirements.txt`
   - `uvicorn backend.api:app --reload`
3. **Frontend**:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Code Style

- **Python**: PEP-8 with Black formatting
- **TypeScript**: ESLint standards provided in the frontend directory

We look forward to your contributions!


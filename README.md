# Vocab-Track
A lightweight vocabulary learning application featuring a flashcard-based interface with adaptive review scheduling and performance-based personalization to support efficient daily language practice.

## Demo Video
https://github.com/user-attachments/assets/f2acec3b-ad32-4d1f-a3ef-31fb88b20e85

## Project Overview
Vocab Track is a vocabulary learning online platform targeted at students and beginner to intermediate language learners. The web-based application is designed to solve the problems of existing apps that are too complex, not customizable, and have poor review systems.

**Key Goals:**
* Enable fast daily vocabulary practice
* Support personalized word book creation
* Provide efficient spaced review to support long-term retention and consistent learning habits

## System Architecture
* **Frontend:** React + Typescript
* **Backend:** Django
* **Database:** Postgresql

## Core Features

### 1. Dictionary Selection & Import
* Users can upload custom vocabulary lists (supporting CSV and TXT files)
* Supports batch import with per-word customization for definitions, examples, and difficulty.
* Users can pick a dictionary and select specific accent preferences.

### 2. Progress Tracking
* A dashboard provides overview statistics per dictionary, including words studied, days active, and average accuracy.
* Activity and performance trends are visualized through daily study activity and daily accuracy charts.
* The system prioritizes words answered incorrectly, making them appear more often in future sessions.

### 3. Word Pronunciation
* Utilizes the SpeechSynthesis Utterance API for fast, on-device text-to-speech.
* Allows user-specified languages to prevent AI misclassification.
* Features an interactive play button conditionally rendered on the flashcard UI, accommodating users who prefer no audio.

### 4. Spaced Repetition (SM-2)
* **Dynamic Scheduling:** Replaces fixed intervals with an adaptive, performance-based review logic to combat the forgetting curve.
* **Personalized Metrics:** Calculates timing based on correctness, ease factor, and historical accuracy.

## Development & Operations

### Project Management
* **Design:** Figma, Miro, Confluence (Iterations)
* **Task Tracking:** Jira Board
* **Version Control & CI/CD:** GitHub, Prettier + Black (Code style)

### Continuous Integration & Deployment (CI/CD)
* **Testing:** High coverage achieved using Vitest for React components and Django/DRF backend tests.
* **Continuous Deployment:** Automated deployment triggered by updates to the `main` branch.
* **Infrastructure:** Services defined with Render Blueprints as Infrastructure as Code.
* **Metrics:** The team maintained a 96% CI Job Success Rate and an 85% Kanban throughput for tasks completed under 24 hours.

## Team Contributions
* **Chengcheng Zhang (Backend Developer):** Designed backend architecture, implemented backend business logic, wrote/maintained unit tests, and documented meeting notes.
* **Zhengyi Zhao (Fullstack Developer):** Implemented frontend/backend features, maintained UI tests, managed user stories, and set up the CD pipeline.
* **Jasmine Zhuang (Fullstack Developer):** Set up CI and test coverage, handled design iterations, and implemented frontend features (progress, import, flashcards).
* **Linxin Zhong (Fullstack Developer):** Set up the frontend framework, implemented frontend components (pronunciation, dictionary selection) and backend apis, and established the project timeline.




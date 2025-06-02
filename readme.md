# ScoutAI - AI-Powered Talent Sourcing Platform

ScoutAI helps recruiters and hiring managers quickly find and evaluate top talent by automating the search and screening process using advanced AI.

![ScoutAI Logo](./Client/public/logo.png)

## Features

- **AI-Powered Search**: Transform natural language queries into precise searches for candidates
- **Automated Candidate Screening**: Filter and score candidates based on your specific requirements
- **LinkedIn Profile Scraping**: Get detailed candidate information from LinkedIn profiles
- **Match Analysis**: Understand why a candidate might be a good fit for your role
- **Personalized Outreach**: AI-generated outreach messages tailored to each candidate
- **Search History**: Track and revisit previous talent searches
- **Detailed Profiles**: View comprehensive candidate profiles with experience, skills, education and more

## Architecture

The application follows a client-server architecture with multiple AI-powered processing steps:

![ScoutAI Architecture](./docs/architecture-diagram.png)

### Core Process Flow:

1. **Query Processing**:
   - User submits a natural language query
   - Gemini AI transforms the query into structured search parameters

2. **Candidate Discovery**:
   - System executes multiple search queries via SerpAPI
   - Initial candidate profiles are identified from search results

3. **Data Enrichment**:
   - LinkedIn profiles are scraped using Apify
   - Profile data is structured and enhanced

4. **Vector Database Storage**:
   - Candidate profiles are embedded as vectors
   - Profiles stored in Firestore with vector embeddings for similarity search

5. **Candidate Analysis**:
   - Candidates are scored against the original query
   - AI generates prescreening questions specific to each candidate
   - Background check flags are created if issues are detected
   - Personalized outreach messages are generated for each candidate

6. **Result Delivery**:
   - Ranked candidate list presented to the user
   - Detailed candidate profiles with all analysis available for review

### System Components:

1. **Client**: React application that handles user interface and interactions
2. **API Server**: Express.js server that coordinates the AI-powered search process
3. **Database**: Firestore for storing user data, search history, and candidate profiles
4. **AI Services**:
   - Gemini for generating search queries and analyzing candidate profiles
   - SerpAPI for executing web searches
   - Apify for LinkedIn profile scraping

## Tech Stack

### Frontend
- React.js with React Router for client-side routing
- Tailwind CSS for styling
- Axios for API requests
- Context API for state management

### Backend
- Node.js with Express for the API server
- Firebase/Firestore for database and authentication
- Google Gemini for natural language processing
- SerpAPI for searching candidate profiles
- Apify for LinkedIn profile scraping

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Firebase account and project
- API keys for:
  - Google AI (Gemini)
  - SerpAPI
  - Apify

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ScoutAI.git
cd ScoutAI
```

2. Install dependencies for both frontend and backend
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd Client
npm install
cd ..
```

3. Create environment files

Backend (.env):
```
GEMINI_API_KEY=your_gemini_api_key
SERPAPI_API_KEY=your_serpapi_key
APIFY_API_TOKEN=your_apify_token
FIREBASE_SERVICE_ACCOUNT_BASE64=your_firebase_credentials_in_base64
GOOGLE_API_KEY=your_google_api_key
CLIENT_URL=http://localhost:5173
```

FrontEnd (.env)
```
VITE_API_URL=http://localhost:3000/api
```

4. Create Firebase indexes
   - Create a composite index for the `searches` collection:
     - Fields: `userId` (ASC), `createdAt` (DESC)
     - You can create this index using the URL provided in the error message when running the application for the first time, or through the Firebase console.

### Running the Application
1. Start the backend server
```bash
npm start
# or for development
npm run dev:backend
```

2. Start the frontend development server
```bash
cd Client
npm run dev
# or from root directory
npm run dev:frontend
```

3. Visit http://localhost:5173 in your browser

## Application Flow
1. **User Authentication**: Users sign in using Firebase Authentication
2. **Search Query**: Users enter a natural language query describing their talent needs
3. **AI Processing**:
   - The system translates the query into search parameters
   - Executes multiple searches to find relevant candidates
   - Scrapes detailed information from LinkedIn profiles
   - Analyzes and scores candidates based on the requirements
4. **Results**: Users view a list of candidates ranked by match score
5. **Candidate Profiles**: Users can access detailed candidate profiles and suggested outreach messages
6. **History**: Users can revisit past searches and their results


## API Endpoints
### Authentication
- `POST /api/auth/login`: Authenticate a user
- `POST /api/auth/register`: Register a new user
### Candidate Search
- `POST /api/candidates/search`: Start a new candidate search
- `GET /api/candidates/search/status/:searchId`: Check the status of a search
- `GET /api/candidates/search/history/:userId`: Get a user's search history

## Project Structure
```
ScoutAI/
├── Backend/
│   ├── config/
│   │   └── firebaseAdmin.js
│   ├── controllers/
│   │   └── hiringControllers.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── candidateRoutes.js
│   │   ├── jsonRag.js
│   │   └── suggestionRoutes.js
│   ├── service/
│   │   ├── agentParent.js
│   │   ├── candidateScreener.js
│   │   ├── linkedInScraper.js
│   │   ├── multiPayloadGenerator.js
│   │   ├── search.js
│   │   └── suggestionForUserPrompt.js
│   ├── firebase.js
│   └── index.js
├── Client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── History.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PersonProfile.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── TalentRow.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── axios.js
│   │   ├── index.css
│   │   └── main.jsx
│   └── index.html
├── package.json
└── readme.md
```

## Future Enhancements
- **Local Database Integration**: Allow hiring teams to connect with their own database for candidate selection
- **Advanced Background Checks**: Scrape information from across the internet to verify candidate details
- **Enhanced Filtering**: Implement more granular filtering of candidates based on specific criteria
- **Interview Scheduling**: Integrate with calendar systems for seamless interview scheduling
- **Bulk Communication**: Send personalized outreach messages to multiple candidates simultaneously
- **Candidate Tracking**: Monitor candidate interactions and track hiring progress
- **Team Collaboration**: Enable teams to collaborate effectively on candidate searches
- **ATS Integration**: Export candidate data to Applicant Tracking Systems and other HR platforms


## License
This project is licensed under the MIT License - see the LICENSE file for details.


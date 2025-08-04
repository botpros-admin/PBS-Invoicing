# Complete MCP Servers Guide

## 1. 🗄️ **Supabase MCP Server**
Database and backend operations for your Supabase projects.

### Features:
- **create_branch** - Create development branches
  - *Example*: "Create a development branch called feature-payments"
- **list_branches** - List all development branches
  - *Example*: "Show me all my Supabase branches"
- **delete_branch** - Delete a development branch
  - *Example*: "Delete the old-feature branch"
- **merge_branch** - Merge branch to production
  - *Example*: "Merge the feature-payments branch to production"
- **reset_branch** - Reset branch to specific migration
  - *Example*: "Reset development branch to migration version 20240115"
- **rebase_branch** - Rebase branch on production
  - *Example*: "Rebase my feature branch with latest production changes"
- **list_tables** - List all database tables
  - *Example*: "Show me all tables in my database"
- **list_extensions** - List database extensions
  - *Example*: "What PostgreSQL extensions are installed?"
- **list_migrations** - List all migrations
  - *Example*: "Show me the migration history"
- **apply_migration** - Apply DDL operations
  - *Example*: "Create a new table called products with id, name, and price columns"
- **execute_sql** - Run SQL queries
  - *Example*: "Select all users created in the last 7 days"
- **get_logs** - Get service logs
  - *Example*: "Show me the last API errors"
- **get_advisors** - Security/performance advisories
  - *Example*: "Check for security issues in my database"
- **get_project_url** - Get API URL
  - *Example*: "What's my Supabase project URL?"
- **get_anon_key** - Get anonymous key
  - *Example*: "Get the anon key for frontend integration"
- **generate_typescript_types** - Generate TypeScript types
  - *Example*: "Generate TypeScript types for all my tables"
- **search_docs** - Search Supabase documentation
  - *Example*: "How do I set up row level security?"
- **list_edge_functions** - List edge functions
  - *Example*: "Show me all deployed edge functions"
- **deploy_edge_function** - Deploy edge functions
  - *Example*: "Deploy a new edge function for payment processing"

## 2. 🐙 **GitHub MCP Server**
Complete GitHub repository management and collaboration.

### Features:
- **create_repository** - Create new repositories
  - *Example*: "Create a new private repo called my-awesome-project"
- **get_repository** - Get repository details
  - *Example*: "Show me details about the PBS_Invoicing repo"
- **list_repositories** - List all repositories
  - *Example*: "List all my GitHub repositories"
- **create_issue** - Create new issues
  - *Example*: "Create an issue titled 'Fix login bug' with high priority"
- **get_issue** - Get issue details
  - *Example*: "Show me details of issue #42"
- **list_issues** - List repository issues
  - *Example*: "Show all open issues labeled as 'bug'"
- **create_pull_request** - Create pull requests
  - *Example*: "Create a PR from feature-branch to main"
- **get_pull_request** - Get PR details
  - *Example*: "Show me PR #15 details"
- **list_pull_requests** - List pull requests
  - *Example*: "List all open pull requests"
- **push_files** - Push file changes
  - *Example*: "Push the updated README.md to main branch"
- **create_branch** - Create new branches
  - *Example*: "Create a new branch called feature-authentication"
- **get_file_contents** - Read repository files
  - *Example*: "Show me the package.json file"
- **search_repositories** - Search for repos
  - *Example*: "Search for React TypeScript starter templates"
- **fork_repository** - Fork repositories
  - *Example*: "Fork the awesome-react-components repo"
- **create_issue_comment** - Comment on issues
  - *Example*: "Add a comment to issue #42 saying 'Working on this now'"

## 3. 📁 **Filesystem MCP Server**
Local file system operations within allowed directories.

### Features:
- **read_file** - Read file contents
  - *Example*: "Read the contents of config.json"
- **write_file** - Write or create files
  - *Example*: "Create a new file called notes.txt with my meeting notes"
- **list_directory** - List directory contents
  - *Example*: "Show me all files in the src folder"
- **create_directory** - Create directories
  - *Example*: "Create a new folder called components"
- **delete_file** - Delete files
  - *Example*: "Delete the old-backup.zip file"
- **move_file** - Move or rename files
  - *Example*: "Rename draft.md to final-report.md"
- **get_file_info** - Get file metadata
  - *Example*: "Show me the size and last modified date of database.db"
- **search_files** - Search for files by name
  - *Example*: "Find all files with 'test' in their name"

## 4. 🧠 **Memory MCP Server**
Persistent memory storage across conversations.

### Features:
- **create_memory** - Store new information
  - *Example*: "Remember that the client's preferred color scheme is blue and gold"
- **retrieve_memory** - Retrieve stored information
  - *Example*: "What was the client's preferred color scheme?"
- **search_memories** - Search through stored memories
  - *Example*: "Search for all memories about project deadlines"
- **list_memories** - List all stored memories
  - *Example*: "Show me everything you remember"
- **delete_memory** - Delete specific memories
  - *Example*: "Forget the old API endpoint"
- **update_memory** - Update existing memories
  - *Example*: "Update the deployment schedule to next Friday"

## 5. 🌐 **Fetch MCP Server**
Simple HTTP client for making web requests.

### Features:
- **fetch** - Make basic HTTP requests
  - *Example*: "Fetch data from https://api.example.com/users"
- **fetchJSON** - Fetch and auto-parse JSON
  - *Example*: "Get the JSON data from the weather API"
- **fetchText** - Fetch as plain text
  - *Example*: "Get the raw HTML from example.com"
- **fetchBinary** - Fetch binary data
  - *Example*: "Download the logo image from the CDN"

## 6. 🤔 **Sequential-Thinking MCP Server**
Structured reasoning for complex problem-solving.

### Features:
- **sequential_thinking** - Step-by-step reasoning chains
  - *Example*: "Help me plan the architecture for a microservices e-commerce platform"
  - *Example*: "Break down the steps to migrate from MongoDB to PostgreSQL"
  - *Example*: "Design a strategy for implementing OAuth2 authentication"

## 7. 🐍 **Python-REPL MCP Server**
Execute Python code in an isolated environment.

### Features:
- **execute** - Run Python code
  - *Example*: "Calculate the compound interest for $10,000 at 5% for 10 years"
  - *Example*: "Generate a list of prime numbers up to 100"
  - *Example*: "Parse this CSV data and create a summary"
- **reset** - Reset Python environment
  - *Example*: "Clear all variables and start fresh"

## 8. 🔧 **HTTP-Everything MCP Server**
Full-featured HTTP toolkit with advanced capabilities.

### Features:
- **All HTTP methods** (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
  - *Example*: "Make a POST request to create a new user"
  - *Example*: "Send a PATCH request to update user preferences"
- **Custom headers management**
  - *Example*: "Add Authorization header with Bearer token"
- **Cookie handling**
  - *Example*: "Maintain session cookies across requests"
- **Authentication support**
  - *Example*: "Set up Basic Auth for API requests"
- **Form data and multipart uploads**
  - *Example*: "Upload a file to the API endpoint"
- **Proxy support**
  - *Example*: "Route requests through a proxy server"
- **Timeout control**
  - *Example*: "Set 30-second timeout for slow APIs"
- **Redirect handling**
  - *Example*: "Follow redirects automatically"
- **Response streaming**
  - *Example*: "Stream large file downloads"

## 9. ⏰ **Time MCP Server**
Time and date operations with timezone support.

### Features:
- **get_current_time** - Get current time
  - *Example*: "What time is it now?"
  - *Example*: "Get current UTC timestamp"
- **convert_timezone** - Convert between timezones
  - *Example*: "Convert 3 PM EST to PST"
  - *Example*: "What time is it in Tokyo when it's noon in London?"
- **add_time** - Time arithmetic
  - *Example*: "What date is 45 days from today?"
  - *Example*: "Add 3 hours and 30 minutes to current time"
- **format_time** - Format timestamps
  - *Example*: "Format current date as YYYY-MM-DD"
  - *Example*: "Convert timestamp to human-readable format"

## 10. 🎭 **Playwright MCP Server**
Browser automation and testing capabilities.

### Features:
- **navigate** - Go to URLs
  - *Example*: "Navigate to https://example.com"
- **screenshot** - Take screenshots
  - *Example*: "Take a screenshot of the current page"
  - *Example*: "Capture the login form area"
- **click** - Click elements
  - *Example*: "Click the submit button"
  - *Example*: "Click on the nav menu"
- **fill** - Fill form fields
  - *Example*: "Fill the email field with test@example.com"
  - *Example*: "Enter password in the login form"
- **evaluate** - Run JavaScript in browser
  - *Example*: "Get all link URLs on the page"
  - *Example*: "Check if element is visible"
- **wait_for_selector** - Wait for elements
  - *Example*: "Wait for the loading spinner to disappear"
  - *Example*: "Wait until the results table appears"

## 11. 📚 **Git MCP Server**
Version control operations for Git repositories.

### Features:
- **init** - Initialize repository
  - *Example*: "Initialize a new git repository"
- **add** - Stage files
  - *Example*: "Stage all changed files"
  - *Example*: "Add only the .js files"
- **commit** - Commit changes
  - *Example*: "Commit with message 'Fix navigation bug'"
- **push** - Push to remote
  - *Example*: "Push changes to origin main"
- **pull** - Pull from remote
  - *Example*: "Pull latest changes from upstream"
- **status** - Check repository status
  - *Example*: "Show me the current git status"
- **log** - View commit history
  - *Example*: "Show the last 10 commits"
- **branch** - Manage branches
  - *Example*: "Create a new feature branch"
  - *Example*: "Switch to development branch"
- **merge** - Merge branches
  - *Example*: "Merge feature branch into main"
- **diff** - View differences
  - *Example*: "Show changes in the current file"
  - *Example*: "Compare main and development branches"

## 12. 🚀 **Netlify MCP Server**
Build, deploy, and manage Netlify sites.

### Features:
- **Create and manage projects**
  - *Example*: "Create a new Netlify site for my React app"
  - *Example*: "List all my Netlify projects"
- **Deploy sites**
  - *Example*: "Deploy the build folder to Netlify"
  - *Example*: "Update my site with the latest changes"
- **Access control management**
  - *Example*: "Add password protection to the staging site"
  - *Example*: "Set up role-based access control"
- **Extension management**
  - *Example*: "Install the Netlify Forms extension"
  - *Example*: "Enable analytics for my site"
- **User and team information**
  - *Example*: "Show my Netlify account details"
  - *Example*: "List team members with deploy access"
- **Form submissions**
  - *Example*: "Enable form handling for the contact form"
  - *Example*: "View form submissions from last week"
- **Environment variables**
  - *Example*: "Add API_KEY environment variable"
  - *Example*: "Create a SECRET_TOKEN for production"

## 13. 🎨 **Render MCP Server**
Manage Render cloud infrastructure and deployments.

### Features:
- **Service creation**
  - *Example*: "Create a new web service from my GitHub repo"
  - *Example*: "Deploy a static site from the build folder"
  - *Example*: "Create a PostgreSQL database named production-db"
- **Workspace management**
  - *Example*: "List all my Render workspaces"
  - *Example*: "Switch to the development workspace"
- **Service operations**
  - *Example*: "List all services in current workspace"
  - *Example*: "Get details about my API service"
  - *Example*: "Update environment variables for the web service"
- **Deploy management**
  - *Example*: "Show deploy history for my app"
  - *Example*: "Get details about the latest deployment"
- **Logs and monitoring**
  - *Example*: "Show error logs from the last hour"
  - *Example*: "Get all logs with 'timeout' in them"
- **Database operations**
  - *Example*: "Create a 5GB PostgreSQL database"
  - *Example*: "Run a read-only query on my database"
  - *Example*: "List all databases in workspace"
- **Key-Value store**
  - *Example*: "Create a new Key-Value instance for caching"
  - *Example*: "List all Key-Value stores"

---

## 🎯 Quick Start Examples

### Building a Full-Stack App:
1. "Create a new GitHub repo for my project" (GitHub)
2. "Initialize git in the current directory" (Git)
3. "Create a PostgreSQL database on Render" (Render)
4. "Set up Supabase tables for users and posts" (Supabase)
5. "Deploy the frontend to Netlify" (Netlify)
6. "Add environment variables for API keys" (Netlify/Render)

### Automated Testing:
1. "Navigate to my app URL" (Playwright)
2. "Fill in the login form" (Playwright)
3. "Take a screenshot of the dashboard" (Playwright)
4. "Check for any console errors" (Playwright)

### Data Analysis:
1. "Read the sales data CSV file" (Filesystem)
2. "Use Python to analyze the data" (Python-REPL)
3. "Create a summary and save it" (Filesystem)
4. "Remember the key insights" (Memory)

# Jenkins Vyavastaha

Run Jenkins pipeline scripts from within VS Code.

## Features

- List Jenkins jobs
- Open Jenkins jobs
- Refresh Jenkins jobs
- Trigger Jenkins jobs with or without parameters

## Installation

1. Install the extension from the VS Code marketplace.
2. Configure your Jenkins server URL and authentication in the extension settings.

## Configuration

You can configure the extension settings in your VS Code `settings.json` file or through the settings UI.

### Settings

- **Jenkins URL**: The base URL of your Jenkins server.
- **Jenkins Username**: The username for Jenkins authentication.
- **Jenkins Password**: The password or API token for Jenkins authentication.
- **Crumb Issuer**: Whether to use crumbIssuer for CSRF protection.
- **Reject Unauthorized**: Whether to reject unauthorized SSL certificates.
- **Job List File Path**: The path to the file where Jenkins jobs are stored. If not specified, a default path within the VS Code storage directory will be used.

### Example Configuration

```json
{
    "jenkins.url": "http://localhost:8080",
    "jenkins.username": "your-username",
    "jenkins.password": "your-api-token",
    "jenkins.crumbIssuer": true,
    "jenkins.rejectUnauthorized": true,
    "jenkins.jobListFilePath": "/path/to/your/job_list.json"
}
```

## Usage

### Listing Jenkins Jobs

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Type `List Jenkins Jobs` and select the command.
3. The list of Jenkins jobs will be displayed in the Explorer view under the "Jenkins Vyavastaha" section.

### Opening a Jenkins Job

1. Click on a job in the list to open its details.
2. A webview will be displayed with the job details and parameters (if any).

### Triggering a Jenkins Job

#### With Parameters

1. When you open a job, the webview will display the job parameters.
2. Fill in the required parameters in the form.
3. Click the `Run Job` button to start the job with the specified parameters.

#### Without Parameters

1. If the job has no parameters, the webview will indicate that no parameters are found.
2. Click the `Run Job` button to start the job without any parameters.

### Refreshing Jenkins Jobs

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Type `Refresh Jenkins Jobs` and select the command.
3. The job list will be refreshed with the latest data from the Jenkins server.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue on [GitHub](https://github.com/balakrishna-maduru/jenkins_vyavastaha.git).

### Development Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Open the project in VS Code.
4. Run the `npm run compile` command to compile the TypeScript code.
5. Press `F5` to start debugging the extension.

## License

SEE LICENSE IN LICENSE.md

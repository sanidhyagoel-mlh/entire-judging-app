# Entire Judge

This app runs on your computer. It sends your project list to the Entire judge plugin. The plugin produces the scores. The app is meant to move the [entireio/entire-judge](https://mlh.link/entire-judge) app's CLI functionality to a user friendly browser environment.

Setup your pre-requisites, start up the app and follow the setup instructions on screen.

## Start the app

1. Install Node.js 18 or newer, the LTS version from [https://nodejs.org](https://nodejs.org).
2. Install Git if you do not already have it.
3. Open this folder inside of VS code or your IDE of choice. 
4. Run these commands, one at a time:

```bash
npm install
npm run dev
```

5. When the terminal says the app is ready, open [http://localhost:3000](http://localhost:3000).
6. Leave that terminal window open while you use the app. Closing it stops the app.

## Install Entire

On the setup screen, click Install. That downloads the Entire CLI and the judge plugin onto this computer. When it finishes, the screen says Entire judge is ready.

## Judge the projects

Upload a spreadsheet saved as CSV. One row is one project. The file has one column, `repo_url`. Each cell must be a public GitHub link. Private repositories are not judged.

Example:

```csv
repo_url
https://github.com/owner/repo
```

In Excel or Google Sheets, put the links in that column and choose Save As or Download as CSV. You can also click Blank template on the setup screen and fill that file in. For reference, see the example.csv at **entire-judging-app/example.csv**

Enter the hackathon name and start time, then click Run evaluation.

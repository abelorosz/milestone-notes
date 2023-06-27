const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const context = github.context;
const token = core.getInput('token') || context.token;
const octokit = github.getOctokit(token);

const owner = core.getInput('owner') || context.payload.repository.owner.login;
const repo = core.getInput('repo') || context.payload.repository.name;
const milestoneNumber = context.payload.milestone.number;

// Get labelMapping from input, parse it as JSON, or use default mapping if input is not provided
const labelMapping = JSON.parse(core.getInput('labelMapping')) || {
  bug: "Bug Fixes",
  enhancement: "New Features",
  feature: "New Features",
};

const noLabelGroup = 'Closed Issues';

const query = `
  query($owner: String!, $repo: String!, $milestoneNumber: Int!) {
    repository(owner: $owner, name: $repo) {
      milestone(number: $milestoneNumber) {
        issues(first: 100) {
          nodes {
            number
            title
            url
            author {
              login
            }
            labels(first: 5) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  }
`;

const generateReleaseNotes = async () => {
  core.info('Generating release notes...');

  if (!owner || !repo || !milestoneNumber || !token) {
    core.setFailed('Missing required context variables: repo owner, repo name, milestone number or repo token.');
    return;
  }

  try {
    const data = await octokit.graphql(query, { owner, repo, milestoneNumber });

    if (!data || !data.repository || !data.repository.milestone) {
      core.setFailed('Invalid response from GitHub API.');
      return;
    }

    const issues = data.repository.milestone.issues.nodes;
    let issueGroups = new Map();

    // Organize issues by label
    issues.forEach((issue) => {
      if (issue.labels.nodes.length === 0) {
        // Handle issues with no labels
        if (!issueGroups.has(noLabelGroup)) {
          issueGroups.set(noLabelGroup, []);
        }
        issueGroups.get(noLabelGroup).push(issue);
      } else {
        // Handle issues with labels
        issue.labels.nodes.forEach((label) => {
          const mappedLabel = labelMapping[label.name] || label.name;

          if (!issueGroups.has(mappedLabel)) {
            issueGroups.set(mappedLabel, []);
          }

          const alreadyAdded = issueGroups.get(mappedLabel).some(groupedIssue => groupedIssue.number === issue.number);
          if (!alreadyAdded) {
            issueGroups.get(mappedLabel).push(issue);
          }
        });
      }
    });

    core.info(`Found ${issueGroups.size} labels and ${issues.length} issues.`);

    let releaseNotes = '';

    // Generate markdown output
    for (let [label, issues] of issueGroups) {
      releaseNotes += `### ${label}\n\n`;

      issues.forEach((issue) => {
        releaseNotes += `- [#${issue.number}](${issue.url}) ${issue.title} (reported by @${issue.author.login})\n`;
      });

      releaseNotes += '\n';
    }

    fs.writeFileSync('RELEASE_NOTES.md', releaseNotes);
    core.info('RELEASE_NOTES.md has been successfully generated!');

  } catch (error) {
    core.setFailed(`Error generating release notes: ${error.message}`);
  }
};

generateReleaseNotes();
module.exports = generateReleaseNotes;

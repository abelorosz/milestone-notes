const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const token = core.getInput('token', { required: true });
const octokit = github.getOctokit(token);
const context = github.context;

const owner = core.getInput('owner') || process.env.GITHUB_REPOSITORY_OWNER;
const repo = core.getInput('repo') || process.env.GITHUB_REPOSITORY_NAME;
const milestoneNumber = context.payload.milestone.number;

const labelMapping = {
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
  if (!owner || !repo || !milestoneNumber || !token) {
    core.error('Missing required context variables: repo owner, repo name, milestone number or repo token.');
    core.setFailed('Action failed due to missing input/context variables.');
    return;
  }

  try {
    const data = await octokit.graphql(query, { owner, repo, milestoneNumber });

    if (!data || !data.repository || !data.repository.milestone) {
      core.error('Invalid response from GitHub API');
      core.setFailed('Action failed due to invalid API response.');
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
    core.info('Release notes have been successfully generated!');

  } catch (error) {
    core.error(`Error generating release notes: ${error.message}`);
    core.setFailed(error.message);
  }
};

generateReleaseNotes();
module.exports = generateReleaseNotes;

const fetch = require('node-fetch');
const db = require('../../Handlers/database');

const owner = 'Evilsaint1022';
const repo = 'CheekyCharlie';
const repoKey = `${owner}_${repo}`;

async function checkAllCommits() {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
      headers: {
        'User-Agent': 'CheekyCharlie',
        'Authorization': `token ${process.env.GITHUB_KEY}`
      }
    });

    const commits = await response.json();

    if (!Array.isArray(commits) || commits.length === 0) {
      return [];
    }

    // Get previously saved SHAs
    let previousCommits = await db.github.get(repoKey);
    if (!Array.isArray(previousCommits)) {
      previousCommits = previousCommits ? [previousCommits] : [];
    }

    // Filter out only new commits
    const newCommits = commits.filter(c => !previousCommits.includes(c.sha));

    if (newCommits.length === 0) {
    }

    return newCommits;
  } catch (err) {
    console.error(`[Github] ${err.message}`);
    return [];
  }
}

module.exports = checkAllCommits;

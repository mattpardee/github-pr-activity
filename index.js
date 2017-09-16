const _ = require('lodash');
const moment = require('moment');
const colors = require('colors');
const commander = require('commander');
const log = require('./lib/log');
const getUserActivity = require('./lib/activity');
require('console.table');

commander
  .version('1.0.0')
  .option('-o, --owner [owner]', 'Owner (username or organization) of the repos to search')
  .option('-u, --user [user]', 'Author of PRs and commenter on PRs (GitHub username)')
  .option('-d, --days <n>', 'Number of days ago', parseInt)
  .parse(process.argv);

const owner = commander.owner;
const user = commander.user;
const daysAgo = commander.days || 30;
const since = moment().subtract(daysAgo, 'days');
const ghSinceFormat = since.format('YYYY-MM-DD');
const between = `${since.format('YYYY/MM/DD')} - ${moment().format('YYYY/MM/DD')}`;

function outputPullRequestDetails(node, options = {}) {
  const prState = node.state;
  const createdAt = moment(node.createdAt);

  log(_.trim(node.title), prState);
  if (options.outputAuthor) log(`Author: ${node.author.login}`, prState);

  log(`Participants: ${_.map(node.participants.edges, participant => {
    return participant.node.name || participant.node.login;
  }).join(', ')}`, prState);

  log(`Opened ${prState === 'OPEN' ? createdAt.calendar() : createdAt.format('lll')}`, prState);
  if (prState === 'MERGED') {
    log(`Merged ${moment(node.mergedAt).format('lll')}`, prState);
  } else if (prState === 'CLOSED') {
    log(`Closed ${moment(node.updatedAt).format('lll')}`, prState);
  }

  log(node.url, prState);

  // Newline
  log('');
}

function checkErrors(body) {
  if (body.errors) {
    console.log(body.errors);
    return true;
  }

  return false;
}

function getRepoSummary(edges) {
  const repoSummary = {};

  _.each(edges, (edge) => {
    const repoLoc = edge.node.repository.nameWithOwner;

    if (!repoSummary[repoLoc]) repoSummary[repoLoc] = { Repo: repoLoc, 'Number': 1 };
    else repoSummary[repoLoc]['Number']++;
  });

  return repoSummary;
}

function handleAuthorActivity(body) {
  if (checkErrors(body)) return;

  const reportName = `Report for ${user} ${between}`;
  log(`\n${reportName}\n${_.repeat('=', reportName.length)}\n`);

  log('Authored PRs\n');

  const edges = body.data.search.edges;

  _.each(edges, (edge) => {
    outputPullRequestDetails(edge.node);
  });

  log(`Authored PR summary: ${edges.length} opened between ${between}\n`);
  console.table(_.values(getRepoSummary(edges)));
}

function handleCommenterActivity(body) {
  if (checkErrors(body)) return;

  const edges = body.data.search.edges;

  log(_.repeat('=', 80));
  log('\nPRs collaborated on\n');

  const nonAuthoredPullRequests = _.filter(edges, (edge) => edge.node.author.login !== user);

  _.each(nonAuthoredPullRequests, (edge) => {
    outputPullRequestDetails(edge.node, { outputAuthor: true });
  });

  log(`Non-authored PR collaboration summary: ${nonAuthoredPullRequests.length} commented on between ${between}\n`);
  console.table(_.values(getRepoSummary(nonAuthoredPullRequests)));
}

Promise.all([
  getUserActivity(owner, user, 'author', ghSinceFormat),
  getUserActivity(owner, user, 'commenter', ghSinceFormat),
])
.then(([authorActivity, commenterActivity]) => {
  handleAuthorActivity(authorActivity);
  handleCommenterActivity(commenterActivity);
})
.catch(err => {
  console.error(err);
});

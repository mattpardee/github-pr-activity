const _ = require('lodash');
const moment = require('moment');
const log = require('./log');
require('console.table');

function checkErrors(body) {
  if (body.errors) {
    console.log(body.errors);
    return true;
  }

  return false;
}

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

function getRepoSummary(edges) {
  const repoSummary = {};

  _.each(edges, (edge) => {
    const repoLoc = edge.node.repository.name;

    if (!repoSummary[repoLoc]) repoSummary[repoLoc] = { Repo: repoLoc, 'Count': 1 };
    else repoSummary[repoLoc]['Count']++;
  });

  return repoSummary;
}

module.exports = {
  analyzeAuthorActivity(body, options = {}) {
    if (checkErrors(body)) return;
    const edges = body.data.search.edges;

    if (!edges.length) {
      log('No authored PRs'.red.bold);
      return;
    }

    _.defaults(options, {
      outputPullRequestDetails: true,
    });

    if (options.outputPullRequestDetails) {
      log('Authored pull requests\n'.bold);
      _.each(edges, (edge) => {
        outputPullRequestDetails(edge.node);
      });
    }

    log(`Authored PR summary (${edges.length} total)\n`.bold.magenta);
    console.table(_.values(getRepoSummary(edges)));
  },

  analyzeCommenterActivity(body, options = {}) {
    if (checkErrors(body)) return;

    const edges = body.data.search.edges;
    const nonAuthoredPullRequests = _.filter(edges, (edge) => edge.node.author.login !== options.user);

    if (!nonAuthoredPullRequests.length) {
      log('No PRs commented on'.red);
      return;
    }

    _.defaults(options, {
      outputPullRequestDetails: true,
    });

    if (options.outputPullRequestDetails) {
      log('\nPull requests commented on\n'.bold);
      _.each(nonAuthoredPullRequests, (edge) => {
        outputPullRequestDetails(edge.node, { outputAuthor: true });
      });
    }

    log(`Non-authored PR comment summary (${nonAuthoredPullRequests.length} total)\n`.bold.magenta);
    console.table(_.values(getRepoSummary(nonAuthoredPullRequests)));
  },
};

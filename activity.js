const _ = require('lodash');
const moment = require('moment');
const commander = require('commander');
const Promise = require('bluebird');
require('colors');
const log = require('./lib/log');
const { getUserPullRequestActivity, getTeamMembers } = require('./lib/github');
const { analyzeAuthorActivity, analyzeCommenterActivity } = require('./lib/analysis');

commander
  .version('1.0.0')
  .option('-o, --owner [owner]', 'Owner of the repos to search')
  .option('-t, --team [team]', 'Team to pull users from')
  .option('-u, --users <items>', 'Users to get pull requests and comment data for', list => list.split(','), [])
  .option('-d, --days <n>', 'Number of days ago', Number, 30)
  .option('--detail', 'Show pull request details', _.identity, false)
  .parse(process.argv);

const since = moment().subtract(commander.days, 'days');
const ghSinceFormat = since.format('YYYY-MM-DD');
const between = `${since.format('YYYY/MM/DD')} - ${moment().format('YYYY/MM/DD')}`;
const reportName = `${between} Report`;

log('');
log(reportName.bgGreen.bold);
log(_.repeat('=', reportName.length).bgGreen.bold);
log('');

const outputPullRequestDetails = !!commander.detail;

function run(users) {
  Promise.map(users, (username) =>
    new Promise(resolve => {
      const user = _.trim(username);

      Promise.all([
        getUserPullRequestActivity(commander.owner, user, 'author', ghSinceFormat),
        getUserPullRequestActivity(commander.owner, user, 'commenter', ghSinceFormat),
      ])
      .then(([authorActivity, commenterActivity]) => {
        log(`\n${user.bgCyan.bold}\n`);

        analyzeAuthorActivity(authorActivity, { outputPullRequestDetails });
        analyzeCommenterActivity(commenterActivity, { user, outputPullRequestDetails });

        resolve();
      })
      .catch(err => {
        console.error(`Error getting ${commander.owner}/${user} activity`, err);
        resolve();
      });
    })
  , { concurrency: 3 })
  .catch(err => {
    console.error(err);
  });
}

if (commander.team) {
  getTeamMembers(commander.owner, commander.team.replace(/ /g, '-'))
  .then(result => {
    const edges = result.data.organization.team.members.edges;
    run(_.map(edges, 'node.login'));
  })
  .catch(err => {
    console.error(`Error getting ${commander.owner}/${commander.team} members`, err);
  })
} else {
  run(commander.users);
}

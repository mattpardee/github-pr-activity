const _ = require('lodash');
const moment = require('moment');
const commander = require('commander');
const Promise = require('bluebird');
require('colors');
const log = require('./lib/log');
const getUserPullRequestActivity = require('./lib/pr_activity');
const { analyzeAuthorActivity, analyzeCommenterActivity } = require('./lib/analysis');

commander
  .version('1.0.0')
  .option('-o, --owner [owner]', 'Owner of the repos to search')
  .option('-u, --user [user]', 'Pull request author and commenter')
  .option('-d, --days <n>', 'Number of days ago', Number, 30)
  .option('-c, --compare <items>', 'Users to compare against', list => list.split(','), [])
  .option('--detail', 'Show pull request details', _.identity, false)
  .parse(process.argv);

const since = moment().subtract(commander.days, 'days');
const ghSinceFormat = since.format('YYYY-MM-DD');

Promise.all([
  getUserPullRequestActivity(commander.owner, commander.user, 'author', ghSinceFormat),
  getUserPullRequestActivity(commander.owner, commander.user, 'commenter', ghSinceFormat),
])
.then(([authorActivity, commenterActivity]) => {
  const between = `${since.format('YYYY/MM/DD')} - ${moment().format('YYYY/MM/DD')}`;
  const reportName = `Report for ${commander.user} ${between}`;

  log('');
  log(reportName.bgGreen.bold);
  log(_.repeat('=', reportName.length).bgGreen.bold);
  log('');

  analyzeAuthorActivity(authorActivity, {
    outputPullRequestDetails: !!commander.detail,
  });
  analyzeCommenterActivity(commenterActivity, {
    user: commander.user,
    outputPullRequestDetails: !!commander.detail,
  });

  if (commander.compare.length) runCompare();
})
.catch(err => {
  console.error(err);
});

function runCompare() {
  log('     Compare     '.bgGreen.bold);
  log('================='.bgGreen.bold);

  Promise.each(commander.compare, (username) =>
    new Promise(resolve => {
      const user = _.trim(username);

      log(`\n${user.bgCyan.bold}\n`);
      Promise.all([
        getUserPullRequestActivity(commander.owner, user, 'author', ghSinceFormat),
        getUserPullRequestActivity(commander.owner, user, 'commenter', ghSinceFormat),
      ])
      .then(([authorActivity, commenterActivity]) => {
        analyzeAuthorActivity(authorActivity, { outputPullRequestDetails: false });
        analyzeCommenterActivity(commenterActivity, { user, outputPullRequestDetails: false });

        resolve();
      })
      .catch(err => {
        console.error(err);
        resolve();
      });
    })
  )
  .catch(err => {
    console.error(err);
  });
}
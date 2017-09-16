const _ = require('lodash');
const moment = require('moment');
const commander = require('commander');
const log = require('./lib/log');
const getUserActivity = require('./lib/activity');
const { analyzeAuthorActivity, analyzeCommenterActivity } = require('./lib/analysis');

const defaultDays = 30;

commander
  .version('1.0.0')
  .option('-o, --owner [owner]', 'Owner of the repos to search')
  .option('-u, --user [user]', 'Pull request author and commenter')
  .option('-d, --days <n>', `Number of days ago (defult ${defaultDays})`, parseInt)
  .parse(process.argv);

const since = moment().subtract(commander.days || defaultDays, 'days');
const ghSinceFormat = since.format('YYYY-MM-DD');

Promise.all([
  getUserActivity(commander.owner, commander.user, 'author', ghSinceFormat),
  getUserActivity(commander.owner, commander.user, 'commenter', ghSinceFormat),
])
.then(([authorActivity, commenterActivity]) => {
  const between = `${since.format('YYYY/MM/DD')} - ${moment().format('YYYY/MM/DD')}`;
  const reportName = `Report for ${commander.user} ${between}`;

  log(`\n${reportName}\n${_.repeat('=', reportName.length)}\n`);

  analyzeAuthorActivity(authorActivity);
  analyzeCommenterActivity(commenterActivity, commander.user);
})
.catch(err => {
  console.error(err);
});

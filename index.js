const _ = require('lodash');
const moment = require('moment');
const colors = require('colors');
const commander = require('commander');
require('console.table');
const token = process.env.TOKEN;
const client = require('graphql-client')({
  url: 'https://api.github.com/graphql',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

commander
  .version('1.0.0')
  .option('-o, --owner [owner]', 'Owner (username or organization) of the repos to search')
  .option('-a, --author [author]', 'Author (GitHub username) of the PRs')
  .option('-d, --days <n>', 'Number of days ago', parseInt)
  .parse(process.argv);

function getUserActivity(owner, author, since) {
  return client.query(`
  {
    search(query: "is:pr user:${owner} author:${author} created:>${since}", type: ISSUE, last: 100) {
      edges {
        node {
          ... on PullRequest {
            title
            state
            mergedAt
            createdAt
            updatedAt
            url
            repository {
              nameWithOwner
            }
            participants(last:100) {
              edges {
                node {
                  name
                  login
                }
              }
            }
          }
        }
      }
    }
  }`, {}, function(req, res) {
    if(res.status === 401) {
      throw new Error('Not authorized');
    }
  });
}

const owner = commander.owner;
const author = commander.author;
const daysAgo = commander.days || 30;
const since = moment().subtract(daysAgo, 'days');
const between = `${since.format('YYYY/MM/DD')} - ${moment().format('YYYY/MM/DD')}`;

getUserActivity(owner, author, since.format('YYYY-MM-DD'))
  .then((body) => {
    const reportName = `Report for ${author} ${between}`;
    log(`\n${reportName}\n${_.repeat('=', reportName.length)}\n`);

    const edges = body.data.search.edges;
    const repoSummary = {};

    _.each(edges, (edge) => {
      const node = edge.node;
      const prState = node.state;
      const createdAt = moment(node.createdAt);
      const repoLoc = node.repository.nameWithOwner;

      // Aggregate some stats about the author's PRs against the
      // repos in this reporting period
      if (!repoSummary[repoLoc]) repoSummary[repoLoc] = { Repo: repoLoc, PRs: 1 };
      else repoSummary[repoLoc].PRs++;

      log(_.trim(node.title), prState);
      log(`Participants: ${_.map(node.participants.edges, participant => {
        return participant.node.name || participant.node.login;
      }).join(', ')}`, prState);

      log(`Opened ${node.state === 'OPEN' ? createdAt.calendar() : createdAt.format('lll')}`, prState);
      if (prState === 'MERGED') {
        log(`Merged ${moment(node.mergedAt).format('lll')}`, prState);
      } else if (prState === 'CLOSED') {
        log(`Closed ${moment(node.updatedAt).format('lll')}`, prState);
      }

      log(node.url, prState);

      // Newline
      log('');
    });

    log(`Summary: ${edges.length} pull request${edges.length === 1 ? '' : 's'} opened between ${between}\n`);
    console.table(_.values(repoSummary));
  })
  .catch((err) => {
    console.error(err);
  });

function log(str, prState) {
  if (typeof prState === 'undefined') {
    console.log(str);
    return;
  }

  if (prState === 'MERGED') console.log(str.yellow);
  else if (prState === 'CLOSED') console.log(str.red);
  else console.log(str.green);
}

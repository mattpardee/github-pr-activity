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
  .option('-u, --user [user]', 'Author of PRs and commenter on PRs (GitHub username)')
  .option('-d, --days <n>', 'Number of days ago', parseInt)
  .parse(process.argv);

/*
 * authorOrCommenter can be either 'author' or 'commenter' (duh)
 */
function getUserActivity(owner, user, authorOrCommenter = 'author', since) {
  return client.query(`
  {
    search(query: "is:pr user:${owner} ${authorOrCommenter}:${user} created:>${since}", type: ISSUE, last: 100) {
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
const user = commander.user;
const daysAgo = commander.days || 30;
const since = moment().subtract(daysAgo, 'days');
const ghSinceFormat = since.format('YYYY-MM-DD');
const between = `${since.format('YYYY/MM/DD')} - ${moment().format('YYYY/MM/DD')}`;

getUserActivity(owner, user, 'author', ghSinceFormat)
  .then((body) => {
    const reportName = `Report for ${user} ${between}`;
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
      if (!repoSummary[repoLoc]) repoSummary[repoLoc] = { Repo: repoLoc, 'Authored PRs': 1 };
      else repoSummary[repoLoc]['Authored PRs']++;

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

    log(`Authored PR summary: ${edges.length} opened between ${between}\n`);
    console.table(_.values(repoSummary));

    return getUserActivity(owner, user, 'commenter', ghSinceFormat);
  })
  .then((body) => {
    const edges = body.data.search.edges;
    const repoSummary = {};

    _.each(edges, (edge) => {
      const repoLoc = edge.node.repository.nameWithOwner;

      if (!repoSummary[repoLoc]) repoSummary[repoLoc] = { Repo: repoLoc, 'PRs collaborated on': 1 };
      else repoSummary[repoLoc]['PRs collaborated on']++;
    });

    log(`PR collaboration summary: ${edges.length} commented on between ${between}\n`);
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
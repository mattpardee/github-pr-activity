# Github PR activity

This tool allows you to get a quick overview of the PRs a member of your organization has been authoring
and collaborating on. You can specify the org, user and how many days you want to pull data from.

## Installation

```console
$ git clone git@github.com:mattpardee/github-pr-activity.git
$ cd github-pr-activity
$ npm install
```

Go generate a [personal GitHub auth token](https://github.com/settings/tokens).

Note GitHub's [rate limiting policy](https://developer.github.com/v4/guides/resource-limitations/)
for their GraphQL API; YMMV if you're using your access token(s) heavily, for example.

You can create a config/github.json file to store the token you'll use for making API requests.
As a fallback the app will use a TOKEN environment var.

## Use

```console
$ TOKEN=[github auth token] node activity --owner [org or username] --user [github username] --days 30
```

**For example**

```console
$ TOKEN=[github auth token] node activity --owner change --user mattpardee --days 45

... or if you have your API token configured in config/github.json ...

$ node activity --owner change --user mattpardee --days 45
```

This will output something like:

```
Report for mattpardee 2017/07/31 - 2017/09/14
=============================================

Some great pull request I've got for you!
Participants: Matt Pardee, Another Greatengineer
Opened Today at 3:22 PM
https://github.com/change/fake_repo/pull/3

...all the other pull requests between that period...

Authored PR summary: 21 pull requests opened between 2017/07/31 - 2017/09/14

Repo                     Count
-----------------------  -----
change/fake_repo         18
change/other_repo        2
change/unfamiliar_repo   1

Non-authored PR collaboration summary: 45 commented on between 2017/07/31 - 2017/09/14

Repo                      Count
------------------------  -----
change/fake_repo          43
change/other_repo         2
```

Pull request summaries are color coded:

* Green means merged
* Yellow means open
* Red means closed without a merge

**Pro tip:** in the mac terminal you can hold Command and click on the URLs to open them in your browser.

_Note: there is currently no pagination support; the code is only able to get the last 100 items, so if
the user you're checking in on is a prolific pull request opener or you go back enough days, you
might bump up against the 100 item limit. Fixing this should be trivial I just haven't done it yet!
Contributions welcome._

## License

MIT

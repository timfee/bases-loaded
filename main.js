
var AIRTABLE_KEY = 'key4nHUrfYM8KIkAB';
var AIRTABLE_URL = 'https://api.airtable.com/v0/appTX11aYhcnQ05Xx/';
var GMAIL_SEARCH =
    'is:important -is:updates -is:forums -is:promotions -is:social';
var EMAIL_REGEXP =
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;
var EMAIL_SELF = 'tim@timfeeley.com';

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  api_('Teammates', {'maxRecords': 3});
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function api_(table, params) {
  var options = {
    'method': 'get',
    'headers': {'Authorization': 'Bearer ' + AIRTABLE_KEY}

  };

  requestUrl = AIRTABLE_URL + encodeURI(table) + '?';
  for (key in params) {
    requestUrl +=
        encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
  }
  if (requestUrl.charAt(requestUrl.length - 1) == '&') {
    requestUrl = requestUrl.slice(0, requestUrl.length - 1)
  }


  var response = UrlFetchApp.fetch(requestUrl, options);


  Logger.log(response.getAllHeaders());
  Logger.log(response.getContentText());
}

function getData() {
  return {employeeList: getDirects(), contactList: getEmails().slice(0, 30)};
}

function getDirects() {
  var employeeList = [];
  var pageToken;

  do {
    page = AdminDirectory.Users.list({
      domain: 'timfeeley.com',
      query: 'directManager=tim@timfeeley.com',
      orderBy: 'givenName',
      maxResults: 100,
      pageToken: pageToken
    });
    var users = page.users;
    if (users) {
      for (var i = 0; i < users.length; i++) {
        var user = users[i];

        employeeList.push(
            {'name': user.name.fullName, 'email': user.primaryEmail});
      }
    } else {
      Logger.log('No users found.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return (employeeList);
}


function getEmails() {
  // Loop through everything Gmail reports as likely important.
  var threads = GmailApp.search(GMAIL_SEARCH, 0, 25);
  var contactList = [];

  // For each thread, collect all messages inside.
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var x = 0; x < messages.length; x++) {
      var message = messages[x];

      // Determine if the message is sent or received.
      var messageFrom = message.getFrom().match(EMAIL_REGEXP);

      // (Assuming we can parse it to begin with!)
      if (messageFrom != null) {
        messageFrom = messageFrom[0];


        if (messageFrom == EMAIL_SELF) {
          // If the user sent it, then collect all recipients
          // as possible people they contact.
          targets = message.getTo().concat(message.getCc(), message.getBcc())
        } else {
          // If the user didn't sent it, collect the sender as a person
          // that contacts them.
          targets = message.getFrom()
        }

        // Look through all comma-separated targets and then
        // keep track of them (by email address).
        targets = targets.trim().split(',');
        for (var t = 0; t < targets.length; t++) {
          contactInformation = parseBlob(targets[t]);
          ci = contactList.findIndex(
              _item => _item.email === contactInformation.email);
          if (ci > -1) {
            contactList[ci]['count'] = contactList[ci]['count'] + 1;
            if (contactList[ci]['name'].length == 0) {
              contactList[ci]['name'] = contactInformation.name;
            }
          } else if (
              contactInformation.email != '' &&
              contactInformation.email != EMAIL_SELF) {
            contactList.push(contactInformation);
          }
        };
      }
    }
  }

  // Sort by volume.
  contactList = contactList.sort(function(a, b) {
    return b.count - a.count
  });

  return (contactList);
}

// Handles:
// 1. Tim Feeley <timfee@slack-corp.com>
// 2. tim@timfeeley.com
function parseBlob(blob) {
  var returnValue = {name: '', email: '', count: 1};
  var emails = blob.match(/[^@<\s]+@[^@\s>]+/g);

  if (emails) {
    returnValue.email = emails[0];
  }

  var names = blob.split(/\s+/);
  if (names.length > 1) {
    names.pop();
    returnValue.name = names.join(' ').replace(/"/g, '').trim();
  }

  return (returnValue);
}

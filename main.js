/**
 * Since this is all hard coded, and super clowny,
 * this is where you'd put your own credentials :)
 */
var EMAIL_SELF = 'tim@timfeeley.com';
var EMAIL_DOMAIN = 'timfeeley.com';



function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
    return HtmlService.createTemplateFromFile('index').evaluate();
}

function getData() {
    return { employeeList: getDirects(), contactList: getEmails().slice(0, 30) };
}

function getDirects() {
    var employeeList = [];
    var pageToken;

    do {
        page = AdminDirectory.Users.list({
            domain: EMAIL_DOMAIN,
            query: 'directManager=' + EMAIL_SELF,
            orderBy: 'givenName',
            maxResults: 100,
            pageToken: pageToken
        });
        var users = page.users;
        if (users) {
            for (var i = 0; i < users.length; i++) {
                var user = users[i];

                employeeList.push({ 'name': user.name.fullName, 'email': user.primaryEmail });
            }
        } else {
            employeeList.push({ 'name': 'No User Found', 'email': 'dummyuser@' + EMAIL_DOMAIN });
        }
        pageToken = page.nextPageToken;
    } while (pageToken);

    return (employeeList);
}


function getEmails() {
    var GMAIL_SEARCH =
        'is:important -is:updates -is:forums -is:promotions -is:social';

    // Loop through everything Gmail reports as likely important.
    var threads = GmailApp.search(GMAIL_SEARCH, 0, 25);
    var contactList = [];

    // For each thread, collect all messages inside.
    for (var i = 0; i < threads.length; i++) {
        var messages = threads[i].getMessages();
        for (var x = 0; x < messages.length; x++) {
            var message = messages[x];

            // Determine if the message is sent or received.
            var messageFrom = message.getFrom().match(
                /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g);

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
    function mask(str, front) {
        var strLen = str.length;
        if (strLen > front) {
            return str.substr(0, front) +
                str.substr(front, strLen - 1).replace(/\w/g, '•') + str.substr(-1, 1);
        }
        return str.replace(/\w/g, '•');
    }

    var returnValue = { name: '', email: '', count: 1 };
    var emails = blob.match(/[^@<\s]+@[^@\s>]+/g);

    if (emails) {
        returnValue.email = emails[0]
            .replace(
                /(\b[\w\.-]+)@([\w\.-]+)(\.\w{2,4}\b)/g,
                function(m, p1, p2, p3) {
                    return mask(p1, 4) + '@' + mask(p2, 4) + p3;
                })
            .toLowerCase();
    }

    var names = blob.split(/\s+/);
    if (names.length > 1) {
        names.pop();

        showCharacters = Math.floor(Math.random() * 3) + 1;
        showDots = Math.floor(Math.random() * 6) + 2;

        firstName = names.shift();
        remainingNames =
            names.join(' ').replace(/"/g, '').trim().substr(0, showCharacters) +
            '•'.repeat(showDots).trim();

        returnValue.name = firstName + ' ' + remainingNames;
    }

    return (returnValue);
}
let activeChatUser;
let activeChat;
let setTimerId;
let conversationIntervalId;
let ScrollTimeoutId;
let isConversationPanelOpen = true;
let activeChatPages = 1;
let hasMoreMessage;
let optionPanelOpen = false;
setAppHeight();
let isMobile = window.matchMedia('(max-width:700px)').matches
document.addEventListener('DOMContentLoaded', async () => {
    getConversationList(conversations)
    //Check for mobile:::::
    let isMobile = window.matchMedia("(max-width: 700px)").matches;
    let currentHash = window.location.hash;
    if (isMobile && currentHash.startsWith('#chat/')) {
        activeChatFromHash(currentHash)
        toggleChatView('chat-main'); // If already on chat, show chat main
    }
    else if (currentHash === "#nav-item-profile") {
        toggleChatView('nav-item-profile')
    }
    //Event Listener for Send Button:::
    const button = document.querySelector('#sendMessage')
    button.addEventListener('click', async () => {
        sendMessage(activeChat, activeChatUser);
    })
    //Creating Event listener for input field:::
    let input = document.querySelector('#message-input')
    input.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            sendMessage(activeChat, activeChatUser);
        }
    })
    ////////////////////////////Event Listener for SideBar:::::::::::::::::::::::::
    let chatitem;
    //selecting nav items::
    let elements = document.querySelectorAll('.nav-item')
    elements.forEach(element => {
        element.addEventListener('click', (event) => {
            ///////////////IF clicked Item is Contacts::::::::::::::::::::::::
            if (element.id === "nav-item-contacts") { //If the clicked item is contacts::
                let allElements = Array.from(element.parentElement.children)//removing and adding active nav-item::
                allElements.forEach(each => each.classList.remove('active'))
                element.classList.add('active')
                isConversationPanelOpen = false; // so that any function meant for conversation panel can stop
                clearInterval(conversationIntervalId)//Clearing the Set interval meant for conversation panel
                toggleChatView("nav-item-contacts")
                history.pushState(element.id, '', `#${element.id}`)
                const chatlistscroll = document.querySelectorAll(".chat-item")
                chatlistscroll.forEach(item => item.remove())//Empty the chat list first.
                contacts.forEach(contact => {
                    chatitem = contactsList(contact)
                    chatitem.addEventListener('click', (event) => {
                        if (!isMobile) {
                            let pastActiveItem = document.querySelector('div.chat-item.active')
                            if (pastActiveItem) { pastActiveItem.classList.remove('active') }
                            event.currentTarget.classList.add('active')
                        }
                        activeChatUser = contact;
                        conversations.find(convo => {
                            if (convo.participants.find(p => p._id === contact._id))
                                activeChat = convo;

                        }
                        )

                        getMessages(contact)
                        toggleChatView('chat-main')
                    })
                })
            }
            else
                ///////////IF Clicked item is Messages::::::::::::::::::
                if (element.id === 'nav-item-messages') {
                    isConversationPanelOpen = true;
                    let allElements = Array.from(element.parentElement.children)
                    allElements.forEach(each => each.classList.remove('active'))
                    element.classList.add('active')
                    toggleChatView('nav-item-messages')
                    history.replaceState(element.id, '', `#${element.id}`)
                    const chatlistscroll = document.querySelectorAll(".chat-item")
                    chatlistscroll.forEach(item => item.remove())
                    getConversationList(conversations)

                }

                else
                    /////////////////If clicked item is profile:::::::::::::::::::::
                    if (element.id === 'nav-item-profile') {
                        if (!isMobile) {
                            toggleProfile();
                            return;
                        }
                        isConversationPanelOpen = false;
                        let allElements = Array.from(element.parentElement.children)
                        allElements.forEach(each => each.classList.remove('active'))
                        element.classList.add('active')
                        toggleChatView('nav-item-profile')
                        history.pushState(element.id, '', `#${element.id}`)
                    }
        })
    })
    //Event listener for Search Bar:::
    document.addEventListener('click', (event => {
        let searchPanel = document.querySelector('.chat-list-search-panel')
        let checkbox = document.querySelector('#search-checkbox')
        let checkboxLabel = document.querySelector('#search-checkbox-label')
        let inputbox = searchPanel.firstElementChild
        if (!(searchPanel.contains(event.target)) && !(checkboxLabel.contains(event.target)) && !(checkbox.contains(event.target))) {
            checkbox.checked = false;
        }
        if (event.target === inputbox) {
            //Event Listener for Search Button:::
            const button = document.querySelector('#search-button')
            button.addEventListener('click', async () => {
                getUserbyUsername(inputbox.value.trim())
            })
            //Event listener for Search field:::
            inputbox.addEventListener('keydown', async (event) => {
                if (event.key === 'Enter') {
                    getUserbyUsername(inputbox.value.trim())
                }
            })
        }
        if (optionPanelOpen) {
            let options = document.querySelectorAll('.chat-item-options.active')
            for (const option of options) {
                if (!option.parentElement.contains(event.target)) {
                    option.classList.remove('active')
                    optionPanelOpen = false;
                }
            }
        }
    }))
    // Event listener for Previous messages::::::::::::::::
    let messageArea = document.getElementById('messages-area')
    messageArea.addEventListener('scroll', async () => {
        if (hasMoreMessage) {
            clearInterval(ScrollTimeoutId)
            let oldScrollHeight = messageArea.scrollHeight;
            let oldScrollTop = messageArea.scrollTop;
            ScrollTimeoutId = setTimeout(async () => {
                if (messageArea.scrollTop <= 50) {
                    activeChatPages += 1;
                    await getMessages(activeChatUser, activeChatPages)

                    window.requestAnimationFrame(() => {
                        let newScrollHeight = messageArea.scrollHeight;
                        messageArea.scrollTop = newScrollHeight + oldScrollTop - oldScrollHeight;
                    })


                }
            }, 100);
        }
    })
    //Event listener for Back button:::::::::::::::::::::
    let backButton = document.getElementById('back-button')
    backButton.addEventListener('click', () => history.back())
    //Event listener for browser back/forward button::::::::::::::
    window.addEventListener('popstate', (event) => {
        if (isMobile) {
            console.log(event.state)
            toggleChatView(event.state)
        }
    })
})
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', setAppHeight)
function setAppHeight() {
    const doc = document.documentElement;
    doc.style.setProperty('--app-height', `${window.innerHeight}px`)
}
function toggleProfile() {
    document.getElementById('user-profile').classList.toggle('active')
}
function activeChatFromHash(currentHash) {
    let chatIdFromHash = currentHash.substring(currentHash.indexOf('/') + 1)
    let chatFind = conversations.find(convo => convo._id.toString() === chatIdFromHash)
    chatFind ? activeChat = chatFind : console.error('No Chat Found');
    activeChatUser = activeChat.participants.find(p => p._id.toString() !== user._id.toString())
    activeChatUser ? getMessages(activeChatUser) : console.error("User not found");
}
function toggleChatView(state) {
    let chatListPanel = document.querySelector('.chat-list-panel')
    let chatMain = document.querySelector('.chat-main')
    let userProfile = document.querySelector('.user-profile')
    let navElements = Array.from(document.querySelector('.main-nav').children)
    if (!isMobile) { // If the device is not mobile, show all panels
        chatListPanel.style.display = 'flex'
        chatMain.style.display = 'flex'
        userProfile.classList.remove('active');
        return;
    }
    if (state === 'chat-main') { // If the event clicked is any chat list
        chatListPanel.style.display = 'none'
        userProfile.style.display = 'none'
        chatMain.style.display = 'flex'
        isConversationPanelOpen = false;
        if (!activeChat) {
            activeChatFromHash(window.location.hash)
        }
        history.pushState('chat-main', '', `#chat/${activeChat._id}`)
    } else
        if (state === 'nav-item-profile') {
            userProfile.style.display = 'flex'
            chatListPanel.style.display = 'none'
            chatMain.style.display = 'none'
        }
        else {
            navElements.forEach(e => {
                if (e.id === state) {
                    e.classList.add('active')
                }
                else {
                    e.classList.remove('active')
                }
            })
            if (!state) {
                navElements[0].classList.add('active')
            }
            chatListPanel.style.display = 'flex' // Default 
            userProfile.style.display = 'none'
            chatMain.style.display = 'none'
            isConversationPanelOpen = true;

        }
}
function ifNewMessage() {
    if (setTimerId) {
        clearInterval(setTimerId);
        console.warn('Removing the existing setInterval..')
    }
    setTimerId = setInterval(() => {
        fetch(`/ifNewMessage`, {
            method: "POST",
            headers: { 'content-type': "application/json" },
            body: JSON.stringify({
                userId: user._id,
                activeUserId: activeChatUser._id,
                lastMessage: activeChatUser.Messages[activeChatUser.Messages.length - 1]
            })
        }).then(response => {
            return response.json()
        }).then(data => {
            if (data.success) {
                let newMessages = data.message
                newMessages.forEach(msg => {
                    activeChatUser.Messages.push(msg) /// Very risky as forEach is not synchronus so, it might lead to problems where the last message of active chatuser is being checked
                    if (isConversationPanelOpen) {
                        gettingRecentChatAtTop(msg.context, msg.updatedAt, activeChat._id)
                    }

                    if (msg.sender !== user._id) {
                        let bubble = createMsgBubble(msg, true)
                        bubble.scrollIntoView({ behavior: 'smooth' })
                    }
                })
            }
        })
    }, 1500);
}
function gettingRecentChatAtTop(context, time, conversationId) {
    let chatText = document.getElementById(conversationId).querySelector(".message-text")
    let chatTime = document.getElementById(conversationId).querySelector('.chat-time')
    let chat = document.getElementById(conversationId)
    let messageArea = chat.parentElement
    messageArea.insertBefore(chat, messageArea.firstChild)
    chatText.innerText = context;
    chatTime.innerText = getTime(time)
}
function getConversationList(conversations) {
    let chatitem;
    conversations.forEach((conversation, index) => {
        conversation.participants.forEach(participant => {
            if (participant._id != user._id) {
                chatitem = chatList(participant, conversation)
                if (index == 0 && !isMobile && !activeChat) {
                    activeChatUser = participant;
                    activeChat = conversation;
                    chatitem.classList.add('active');
                    getMessages(participant)
                }
                chatitem.addEventListener('click', (event) => {
                    activeChatPages = 1;
                    activeChatUser = participant;
                    activeChat = conversation;
                    if (!isMobile) {
                        let pastchat = document.querySelector(".chat-item.active")
                        pastchat ? pastchat.classList.remove('active') : null;
                        event.currentTarget.classList.add('active')
                    }
                    getMessages(participant)
                    toggleChatView('chat-main')
                })
                if (!isMobile) {
                    let btn = chatitem.lastChild.firstChild
                    btn.addEventListener('click', event => {
                        let anyActiveChatOptions = document.querySelectorAll('.chat-item-options.active')
                        if (anyActiveChatOptions.length > 0) {
                            for (const each of anyActiveChatOptions) {
                                if (btn.nextElementSibling !== each) {
                                    each.classList.remove('active')
                                }
                            }
                        }
                        let allOptions = btn.nextElementSibling
                        optionPanelOpen = allOptions.classList.toggle('active')
                        event.stopPropagation();
                    })
                    let allOptions = btn.nextElementSibling
                    allOptions.addEventListener('click', event => {
                        if (event.target.dataset.action === 'delete-conversation') {
                            if (confirm('Delete all Messages?')) {
                                deleteAllMessages(event.target.dataset.conversationid);
                            } else {
                                allOptions.classList.remove('active')
                                optionPanelOpen = false;
                                event.preventDefault();
                            }
                        }
                        event.stopPropagation();
                    }, false)
                }

            }
            else {
                return;
            }
        })
    });
    setIntervalForNewMessages();
}
function chatList(participant, conversation) {
    //Creating Tags::
    const chatlistscroll = document.querySelector(".chat-list-scroll")
    const heading = document.querySelector('div.chat-list-header h2')
    const chatitem = document.createElement('div')
    chatitem.classList.add('chat-item')
    const chatavatar = document.createElement('div')
    chatavatar.classList.add('chat-avatar')
    const img = document.createElement('img')
    const chatinfo = document.createElement('div')
    chatinfo.classList.add('chat-info')
    const chatheader = document.createElement('div')
    chatheader.classList.add('chat-header')
    const chatname = document.createElement('span')
    chatname.classList.add('chat-name')
    const chattime = document.createElement('span')
    chattime.classList.add('chat-time')
    const chatlastmessage = document.createElement('div')
    chatlastmessage.classList.add('chat-last-message')
    const messagetext = document.createElement('span')
    messagetext.classList.add('message-text')
    const unreadcount = document.createElement('span')
    unreadcount.classList.add('unread-count')
    const menu = document.createElement('div')
    menu.classList.add('chat-list-menu');
    const options = document.createElement('div')
    options.classList.add('chat-item-options')
    //Filling Up::
    img.src = participant.profilePicUrl || "https://dummyimage.com/50X50/3c006b/FFFFFF?text=" + participant.firstName[0] + participant.lastName[0]
    img.alt = participant.firstName

    chatname.innerText = participant.firstName + " " + participant.lastName;
    conversation.lastMessage ? messagetext.innerText = conversation.lastMessage : null;


    let pastdate = new Date(conversation.lastMessageAt)
    chattime.innerText = getTime(pastdate)

    heading.innerText = 'Message'

    chatitem.id = conversation._id;

    menu.innerHTML += '<i  class="fa-solid fa-ellipsis-vertical chat-item-options-btn"></i>'

    options.innerHTML += `<p data-action="delete-conversation" data-ConversationId="${conversation._id}" class="chat-item-option">Delete Conversation</p>`
    //Appending into DOM:
    chatavatar.appendChild(img)
    chatheader.appendChild(chatname)
    chatheader.appendChild(chattime)
    chatlastmessage.appendChild(messagetext)
    chatlastmessage.appendChild(unreadcount)
    chatinfo.appendChild(chatheader)
    chatinfo.appendChild(chatlastmessage)
    menu.appendChild(options)
    chatitem.appendChild(chatavatar)
    chatitem.appendChild(chatinfo)
    !isMobile ? chatitem.appendChild(menu) : null;
    chatlistscroll.appendChild(chatitem)

    return chatitem
}
function getTime(pastdate) {
    let mydate = new Date()
    pastdate = new Date(pastdate)
    let construct = "NoDate"
    // if in past year::
    if (pastdate.getFullYear() !== mydate.getFullYear()) {
        construct = pastdate.toLocaleDateString('default', { day: "numeric", month: "short", year: "numeric" })
    }
    //if older than a week::
    if (pastdate.getTime() < (mydate.getTime() - (24 * 60 * 60 * 1000 * 7)) &&
        pastdate.getFullYear() === mydate.getFullYear()) {
        construct = pastdate.toLocaleDateString('default', { day: "2-digit", month: "short" })
    }
    // if within 7 days::
    if (pastdate.getTime() > mydate.getTime() - (24 * 60 * 60 * 1000 * 7) &&
        pastdate.getTime() < mydate.getTime() - (24 * 60 * 60 * 1000 * 1)) {
        construct = pastdate.toLocaleString('default', { weekday: "short" })
    }
    // if wihtin 24 hours::
    if (pastdate.getTime() > mydate.getTime() - (24 * 60 * 60 * 1000) &&
        pastdate.getTime() < mydate.getTime()) {
        //if today or yesterday::
        if (pastdate.getDate() === mydate.getDate()) {
            construct = pastdate.toLocaleString('default', { hour: 'numeric', minute: '2-digit' })
        }
        else {
            construct = "Yesterday"
        }
    }
    return construct;
}
function createMsgBubble(msg, isSending = false) {
    const messageArea = document.querySelector('#messages-area')
    let messagebubble = document.createElement('div');
    messagebubble.classList.add('message-bubble')
    const time = document.createElement('span')
    time.classList.add('message-timestamp')
    const text = document.createElement('span')
    text.classList.add('message-text')
    if (!(msg.sender === user._id)) {
        messagebubble.classList.add('received')
    }
    else {
        messagebubble.classList.add('sent')
    }
    text.innerText = msg.context;
    time.innerText = new Date(msg.updatedAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit' })
    messagebubble.appendChild(text);
    messagebubble.appendChild(time);
    if (isSending) {
        messageArea.append(messagebubble)
    }
    else {
        messageArea.prepend(messagebubble)
    }
    return messagebubble;
}
function contactsList(contact) {
    const chatlistscroll = document.querySelector(".chat-list-scroll")

    const chatitem = document.createElement('div')
    chatitem.classList.add('chat-item')

    const chatavatar = document.createElement('div')
    chatavatar.classList.add('chat-avatar')

    const img = document.createElement('img')

    const chatinfo = document.createElement('div')
    chatinfo.classList.add('chat-info')

    const chatheader = document.createElement('div')
    chatheader.classList.add('chat-header')

    const chatname = document.createElement('span')
    chatname.classList.add('chat-name')

    const chatlastmessage = document.createElement('div')
    chatlastmessage.classList.add('chat-last-message')

    const messagetext = document.createElement('span')
    messagetext.classList.add('message-text')

    const chatlistscrollheading = document.querySelector("div.chat-list-header h2")
    chatlistscrollheading.innerText = "Contacts"
    img.src = contact.profilePicUrl || " https://dummyimage.com/50x50/3c006b/FFFFFF?text=" + contact.firstName[0] + contact.lastName[0]
    img.alt = contact.username

    chatname.innerText = contact.firstName + " " + contact.lastName;

    messagetext.innerText = contact.bio;
    chatavatar.append(img)
    chatheader.append(chatname)
    chatinfo.append(chatheader)
    chatlastmessage.append(messagetext)
    chatinfo.append(chatlastmessage)
    chatitem.append(chatavatar)
    chatitem.append(chatinfo)
    chatlistscroll.append(chatitem)

    return chatitem
}
//Function to get the past messages:::
async function getMessages(participant, pageN = 1) {
    clearInterval(setTimerId)
    let messages = await fetch('/getMessages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ participant: participant._id, user: user._id, pageN })
    }).then(response => {
        return response.json()
    })
    if (messages.success) {
        //Selecting and filling up DOM Elements::
        const avatarImg = document.querySelector("#chat-avatar-main img")
        avatarImg.src = participant.profilePicUrl || " https://dummyimage.com/50x50/3c006b/FFFFFF?text=" + participant.firstName[0] + participant.lastName[0]

        const name = document.querySelector('#chat-name-main')
        name.innerText = participant.firstName + " " + participant.lastName

        const status = document.querySelector('#chat-status-main')
        status.innerText = participant.status

        const messageArea = document.querySelector('#messages-area')

        let loadedMessage = messages.message;

        if (pageN === 1) {
            messageArea.innerHTML = '';
            activeChatUser.Messages = [loadedMessage[0]]
        }
        else {

        }
        loadedMessage.forEach((msg) => {
            messagebubble = createMsgBubble(msg)
        });
        if (pageN == 1) {
            messageArea.scrollTop = messageArea.scrollHeight;
        }
        if (loadedMessage.length) {
            ifNewMessage()
            hasMoreMessage = loadedMessage.length === 20;
        }
        else {
            hasMoreMessage = false;
        }
    }
}
//Function to send Message ::::
async function sendMessage(conversation, participant) {
    let messagebubble;
    let text = document.querySelector('#message-input')
    let context = text.value.trim();
    let time = new Date()
    if (!context) {
        return;
    }
    messagebubble = createMsgBubble({
        sender: user._id,
        context: context,
        updatedAt: time,
    }, true)
    text.value = '';
    if (messagebubble) {
        messagebubble.scrollIntoView({ behavior: 'smooth' })

    }
    //Sending message to the backend for DB:::
    let result = await fetch('/saveMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            sender: user._id,
            receiver: participant._id,
            context: context,
            updatedAt: time
        })
    }).then(response => { return response.json() })
    if (result.success) {
        if (isConversationPanelOpen) {
            gettingRecentChatAtTop(context, time, conversation._id)
        }
    }

}
//Function to delete all messages:::
async function deleteAllMessages(conversationId) {
    let result = await fetch(`/deleteAllMessages/${conversationId}`).then(response => response.json())
    if (result.success) {
        console.log(result.message)
        document.getElementById(conversationId).remove()
        conversations = conversations.filter(convo => convo._id.toString() !== conversationId.toString())
        if(conversationId === activeChat._id && !isMobile) {
            const messageArea = document.querySelector('#messages-area')
            messageArea.innerHTML = '';
            activeChatUser = null;
            activeChat = null;
            document.querySelector('#chat-avatar-main img').src = 'https://dummyimage.com/50x50/3c006b/FFFFFF?text=NA';
            document.querySelector('#chat-name-main').innerText = '';
            document.querySelector('#chat-status-main').innerText = '';
        }
    }
    else { console.error(result.message) }
}
//Function to get the searched username
async function getUserbyUsername(username) {
    let result = await fetch('/getUserByUsername', {
        method: 'POST',
        body: username
    }).then(response => { return response.json() }).then(data => { return data })
    if (result.success) {
        searchedUser = result.message;
        let searchlist = document.querySelector('.search-list')
        searchlist.innerHTML = '';
        let searchitem = document.createElement('div')
        searchitem.classList.add('search-item', 'chat-item')
        let userName = document.createElement('span')
        userName.innerText = searchedUser.firstName + ' ' + searchedUser.lastName;
        let connectBtn = document.createElement('button')
        connectBtn.classList.add('send-button')
        connectBtn.innerText = 'Connect';
        searchitem.append(userName)
        searchitem.append(connectBtn)
        searchlist.append(searchitem)
        let connectOrDisconnect = '/addToContacts';
        connectBtn.addEventListener('click', async () => {
            await fetch(connectOrDisconnect, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ userId: user._id, connectionUserId: searchedUser._id })
            }).then(response => { return response.json() }).then(data => {
                if (connectOrDisconnect === "/addToContacts") {
                    connectBtn.innerText = 'Disconnect'
                    connectOrDisconnect = "/removeFromContacts";
                }
                else {
                    connectBtn.innerText = 'Connect'
                    connectOrDisconnect = "/addToContacts"
                }
            })
        })
    }
    else {
        console.error(result.message)
    }
}
//Function to check for new messages from user other than the active user
async function setIntervalForNewMessages() {
    if (conversationIntervalId) {
        clearInterval(conversationIntervalId)

    }
    conversationIntervalId = setInterval(async () => {
        let result = await fetch('/ifnewConversationMessage',
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(conversations)
            }
        ).then(response => response.json())
        if (result.success) {
            let list = result.message;
            list.forEach(convo => {
                let messageText = document.getElementById(convo._id).querySelector('.message-text')
                messageText.innerText = convo.lastMessage;
                let chatTime = document.getElementById(convo._id).querySelector('.chat-time')
                chatTime.innerText = getTime(convo.lastMessageAt)

                let storedConvo = conversations.find(pastC => pastC._id.toString() === convo._id.toString())
                storedConvo.lastMessage = convo.lastMessage
                storedConvo.lastMessageAt = convo.lastMessageAt
                gettingRecentChatAtTop(convo.lastMessage, convo.lastMessageAt, convo._id)
            })
        }
        if (result.status === 500) {
            console.error("Internal Server Error Fetching New Messages")
        }

    }, 2000);
}
//Profile of other user.
//Add authentication and authorization (Json Web Tokens)
//Archives section
//date bubble in chat-main
//Set the width of side-navbar so that it doesn't change when changing chats.
//Add an animation till the user gets registered on register page
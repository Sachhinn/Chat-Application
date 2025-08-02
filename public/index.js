let activeChatUser;
let activeChat;
let setTimerId;
let conversationIntervalId;
let ScrollTimeoutId;
let isConversationPanelOpen = true;
let activeChatPages = 1;
let hasMoreMessage;
let isMobile = window.matchMedia('(max-width:700px)').matches
document.addEventListener('DOMContentLoaded', async () => {
    getConversationList(conversations)
    //Check for mobile:::::
    let isMobile = window.matchMedia("(max-width: 768px)").matches;
    let currentHash = window.location.hash;
    if (isMobile && currentHash.startsWith('#chat/')) {
        let chatIdFromHash = currentHash.substring(currentHash.indexOf('/') + 1)
        let chatFind = conversations.find(convo => convo._id.toString() === chatIdFromHash)
        chatFind?activeChat=chatFind:console.error('No Chat Found');
        activeChatUser = activeChat.participants.find(p=>p._id.toString()!==user._id.toString())
        activeChatUser? getMessages(activeChatUser):console.error("User not found");
        toggleChatView('chat-main'); // If already on chat, show chat main
    } else if (isMobile) {
        toggleChatView('nav-item-messages'); // Default to chat list on mobile
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
    //Event Listener for SideBar:::::::::::::::::::::::::
    let chatitem;
    //selecting nav items::
    let elements = document.querySelectorAll('.nav-item')
    elements.forEach(element => {
        element.addEventListener('click', (event) => {

            ///////////////IF clicked Item is COntacts::::::::::::::::::::::::
            if (element.id === "nav-item-contacts") { //If the clicked item is contacts::
                let allElements = Array.from(element.parentElement.children)//removing and adding active nav-item::
                allElements.forEach(each => each.classList.remove('active'))
                element.classList.add('active')
                isConversationPanelOpen = false; // so that any function meant for conversation panel can stop
                clearInterval(conversationIntervalId)//Clearing the Set interval meant for conversation panel
                toggleChatView("nav-item-contacts")
                history.pushState(element.id , '',`#${element.id}`)
                const chatlistscroll = document.querySelectorAll(".chat-item")
                chatlistscroll.forEach(item => item.remove())//Empty the chat list first.
                contacts.forEach(contact => {
                    chatitem = contactsList(contact)
                    chatitem.addEventListener('click', (event) => {
                        if(!isMobile){
                            let pastActiveItem = document.querySelector('div.chat-item.active')
                            if (pastActiveItem) { pastActiveItem.classList.remove('active') }
                            event.currentTarget.classList.add('active')
                        }
                        activeChatUser = contact;
                        getMessages(contact)
                        toggleChatView('chat-main')
                    })
                })
            }
            else
                ///////////IF Clicked item is Messages::::::::::::::::::
                if (element.id === 'nav-item-messages') {
                    isConversationPanelOpen = true;
                    if(!isMobile){
                        let allElements = Array.from(element.parentElement.children)
                        allElements.forEach(each => each.classList.remove('active'))
                        element.classList.add('active')
                    }
                    toggleChatView('nav-item-messages')
                    history.replaceState(element.id ,'',`#${element.id}`)
                    const chatlistscroll = document.querySelectorAll(".chat-item")
                    chatlistscroll.forEach(item => item.remove())
                    getConversationList(conversations)

                }
        })
    })
    //Event listener for Search Bar:::
    document.addEventListener('mousedown', (event => {
        let searchPanel = document.querySelector('.chat-list-search-panel')
        let checkbox = document.querySelector('#search-checkbox')
        let checkboxLabel = document.querySelector('#search-checkbox-label')
        let inputbox = searchPanel.firstElementChild
        if (!(searchPanel.contains(event.target)) && !(checkboxLabel.contains(event.target))) {
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
        if(isMobile){
            toggleChatView(event.state)
        }
    })
})


function toggleChatView(state) {
    let chatListPanel = document.querySelector('.chat-list-panel')
    let chatMain = document.querySelector('.chat-main')
    if (!isMobile) { // If the device is not mobile
        chatListPanel.style.display = 'flex'
        chatMain.style.display = 'flex'
        return;
    }
    if (state === 'chat-main') { // If the event clicked is any chat list
        chatListPanel.style.display = 'none'
        chatMain.style.display = 'flex'
        isConversationPanelOpen = false;
        history.pushState({ panel: 'chat-main' , converationId:activeChat._id}, '', `#chat/${activeChat._id}`)
    }
    else{
        chatListPanel.style.display = 'flex'
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
                        let bubble = createMsgBubble(msg , true)
                        bubble.scrollIntoView({ behavior: 'smooth' })
                    }
                })
            }
        })
    }, 3000);
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
                if (index == 0 && !isMobile) {
                    activeChatUser = participant;
                    activeChat = conversation;
                    chatitem.classList.add('active');
                    getMessages(participant)
                }
                chatitem.addEventListener('click', (event) => {
                    activeChatPages = 1;
                    activeChatUser = participant;
                    activeChat = conversation;
                    if(!isMobile){
                        let pastchat = document.querySelector(".chat-item.active")
                        pastchat?pastchat.classList.remove('active'):null;
                        event.currentTarget.classList.add('active')
                    }
                    getMessages(participant)
                    toggleChatView('chat-main')
                })
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

    //Filling Up::
    img.src = "https://dummyimage.com/50X50/3c006b/FFFFFF?text=" + participant.firstName[0] + participant.lastName[0]
    img.alt = participant.firstName

    chatname.innerText = participant.firstName + " " + participant.lastName;

    messagetext.innerText = conversation.lastMessage

    let pastdate = new Date(conversation.lastMessageAt)
    chattime.innerText = getTime(pastdate)

    heading.innerText = 'Message'

    chatitem.id = conversation._id;
    //Appending into DOM:
    chatavatar.appendChild(img)
    chatheader.appendChild(chatname)
    chatheader.appendChild(chattime)
    chatlastmessage.appendChild(messagetext)
    chatlastmessage.appendChild(unreadcount)
    chatinfo.appendChild(chatheader)
    chatinfo.appendChild(chatlastmessage)
    chatitem.appendChild(chatavatar)
    chatitem.appendChild(chatinfo)
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
    if (!(msg.sender === user._id)) {
        messagebubble.classList.add('received')
    }
    else {
        messagebubble.classList.add('sent')
    }
    messagebubble.innerText = msg.context
    const time = document.createElement('span')
    time.classList.add('message-timestamp')
    time.innerText = new Date(msg.updatedAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit' })
    messagebubble.appendChild(time)
    if(isSending){
        messageArea.append(messagebubble)
    }
    else{
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
    img.src = " https://dummyimage.com/50x50/3c006b/FFFFFF?text=" + contact.firstName[0] + contact.lastName[0]
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
        avatarImg.src = " https://dummyimage.com/50x50/3c006b/FFFFFF?text=" + participant.firstName[0] + participant.lastName[0]

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
    } , true)
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
//Function to check for new messages from user different than the active user
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

    }, 5000);
}
// Learn Windows back and forward button functioning and implement it in the website.
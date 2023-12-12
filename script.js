const messageInput = document.getElementById('message-input');
const sendMessage = document.getElementById('send-message');
const messageHistory = document.querySelector('.message-history');
const userMeter = document.querySelector('.user-meter');
const userMeterValue = userMeter.querySelector('.value');
const userMeterPercentage = userMeter.querySelector('.bar .percentage');
const botMeter = document.querySelector('.bot-meter');
const botMeterValue = botMeter.querySelector('.value');
const botMeterPercentage = botMeter.querySelector('.bar .percentage');
const time = document.querySelector('.time');
const timePercentage = time.previousElementSibling;
const currentDifficulty = document.querySelector('.current-difficulty');
const letterInfo = document.querySelector('.letter-info');
const messageZone = messageInput.parentElement;
const mainMenu = document.querySelector('.main-menu');
const start = document.getElementById('start');

messageHistory.style.paddingTop = `${userMeter.closest('.meters').offsetHeight + 8}px`;

messageInput.addEventListener('input', () => {
    messageInput.value = messageInput.value.replace(/[^a-zA-Zé]/, '').replace(/^./, match => match.toUpperCase());
});

const MAX_SCORE = 50;
let difficulty = 'medium';
let defaultTimer = 15;
let timer = defaultTimer;
let playerScore = 0;
let botScore = 0;
let timeout = 3;
let usedWords = [];
let timerId;
let chosenLetter = String.fromCharCode(Math.floor(Math.random() * (90 - 65 + 1)) + 65);
letterInfo.innerHTML = letterInfo.innerHTML.replace('?', chosenLetter);

sendMessage.addEventListener('click', () => {
    let rotationLevel = 0;
    if (messageInput.value.trim() == '') return;
    sendMessage.setAttribute('disabled', '');
    clearInterval(timerId);

    let rotationId = setInterval(() => {
        rotationLevel++;
        sendMessage.innerHTML = '<span class="material-symbols-outlined">refresh</span>';
        const sendIcon = sendMessage.querySelector('span');
        sendIcon.style.transform = `rotate(${rotationLevel}deg)`;
    });

    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${messageInput.value}`)
        .then(res => {
            if (!res.ok) {
                if (res.status === 404) {
                    sendNewMessage('Unknown word. Try again with a different word!', true);
                    smoothScroll();
                    startTimer();
                    sendMessage.removeAttribute('disabled');
                    throw new Error('Unknown word');
                } else {
                    throw new Error('HTTP error! status: ' + res.status);
                }
            }
            return res.json();
        })
        .then(() => {
            if (timeout != 3) return;
            if (messageInput.value.charAt(0) != chosenLetter) {
                sendNewMessage(`Your word doesn't start with the letter '${chosenLetter}'. Try again with a different word!`, true);
                smoothScroll();
                startTimer();
                sendMessage.removeAttribute('disabled');
                return;
            }
            if (messageInput.value.length < 3) {
                sendNewMessage('Please ensure that your word is at least three letters long.', true);
                smoothScroll();
                startTimer();
                sendMessage.removeAttribute('disabled');
                return;
            }
            if (usedWords.includes(messageInput.value.toLowerCase())) {
                sendNewMessage('It seems like this word has been used already. Try again with a different word!', true);
                smoothScroll();
                startTimer();
                sendMessage.removeAttribute('disabled');
                return;
            }

            startTimer();
            sendNewMessage(messageInput.value);
            let lastLetter = messageInput.value.charAt(messageInput.value.length - 1);
            findWordStartingWith(lastLetter);
            smoothScroll();
            usedWords.push(messageInput.value.toLowerCase());
            playerScore += messageInput.value.length;
            userMeterValue.innerHTML = playerScore < 10 ? `0${playerScore}` : playerScore;
            userMeterPercentage.style.width = `${(playerScore / MAX_SCORE) * 100}%`;
            playerScore >= MAX_SCORE ? winningScene('player') : undefined;

            timeout = 0;

            let timeoutId = setInterval(() => {
                timeout++;
                if (timeout >= 3) clearInterval(timeoutId);
            }, 300);

            setTimeout(() => {
                messageInput.value = '';
                timer = defaultTimer;
            });
        })
        .catch(error => {
            if (error.message != 'Unknown word') {
                sendNewMessage(`An error occurred: ${error.message}.<br>You have to <span onclick="location.reload();" class="fake-anchor">refresh</span> the page to play again.`, true);
            }
        })
        .finally(() => {
            setTimeout(() => {
                rotationLevel = 0;
                sendMessage.innerHTML = '<span class="material-symbols-outlined">send</span>';
                const sendIcon = sendMessage.querySelector('span');
                sendIcon.style.removeProperty('transform');
                clearInterval(rotationId);
            });
        });
});

let isThinking = false;

function findWordStartingWith(letter) {
    clearInterval(timerId);

    if (!isThinking) {
        const thinking = document.createElement('div');
        thinking.classList.add('bot', 'thinking');
        thinking.innerHTML = `
        <div class="message-container">
            <div class="message" style="display: flex; gap: calc(var(--common-px) / 2);">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        </div>
        `;
        messageHistory.appendChild(thinking);
        isThinking = true;
    }

    let originalUrl = 'https://random-word-api.herokuapp.com/word?number=100&length=';
    let url;

    function random(min = 7, max = 10) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    if (difficulty == 'easy') {
        url = originalUrl + random(3, 5);
    } else if (difficulty == 'hard') {
        url = originalUrl + random(10, 13);
    } else if (difficulty == 'expert') {
        url = originalUrl + random(13, 16);
    } else {
        url = originalUrl + random();
    }

    fetch(url)
        .then(res => res.json())
        .then(words => {
            for (let word of words) {
                if (word.charAt(0).toLowerCase() === letter.toLowerCase() && !usedWords.includes(word)) {
                    if (playerScore >= MAX_SCORE) return;

                    sendNewMessage(word.replace(/^./, match => match.toUpperCase()), false, 'bot');
                    smoothScroll();
                    botScore += word.length;
                    botMeterPercentage.style.width = `${(botScore / MAX_SCORE) * 100}%`;
                    botMeterValue.innerHTML = botScore < 10 ? `0${botScore}` : botScore;
                    chosenLetter = word.charAt(word.length - 1).toUpperCase();
                    letterInfo.innerHTML = letterInfo.innerHTML.replace(/:\s.+/, `: ${chosenLetter}`);
                    usedWords.push(word.toLowerCase());
                    sendMessage.removeAttribute('disabled');
                    const thinkingDiv = document.querySelector('.thinking');
                    if (thinkingDiv) {
                        thinkingDiv.remove();
                    }
                    isThinking = false;
                    if (botScore >= MAX_SCORE) {
                        winningScene('bot');
                        return;
                    }
                    startTimer();
                    return;
                }
            }
            findWordStartingWith(letter);
        })
        .catch(error => {
            sendNewMessage(error.message, true, 'bot');
            const thinkingDiv = document.querySelector('.thinking');
            if (thinkingDiv) {
                thinkingDiv.remove();
            }
            isThinking = false;
        });
}

function fixScrolling() {
    if (document.body.scrollHeight + 10 > document.body.clientHeight) {
        messageZone.style.position = 'fixed';
        messageZone.style.bottom = '0';
        messageHistory.style.marginBottom = 'calc(var(--common-px) * 3)';

        messageHistory.querySelectorAll('.sent-message').forEach(message => {
            message.removeAttribute('style');
        });

        if (messageHistory.lastElementChild) {
            messageHistory.lastElementChild.style.marginBottom = '1in';
        }
    }

    requestAnimationFrame(fixScrolling);
}

fixScrolling();

function smoothScroll() {
    window.scrollTo({
        top: document.body.scrollHeight,
        left: 0,
        behavior: 'smooth'
    });
}

document.addEventListener('keyup', e => {
    if (e.key == 'Enter') sendMessage.click();
});

function sendNewMessage(string = 'New Message', error = false, person = 'user') {
    const message = document.createElement('div');
    message.classList.add('sent-message', person);
    message.innerHTML = `
    <div class="message-container">
        <div class="message" ${error ? 'style="background-color: #8d2d2d;"' : ''}>${string}</div>
    </div>
    `;
    messageHistory.appendChild(message);
    return message;
}

function winningScene(agent = '') {
    const won = document.createElement('div');
    won.innerHTML = `
    <h2>${agent == 'player' ? 'You' : 'The bot has'} won!</h2>
    <div ${agent == 'player' ? 'style="margin-bottom: var(--common-px);"' : ''}>Winner's score: ${agent == 'player' ? playerScore : botScore}</div>
    ${agent == 'bot' ? `<div style="margin-bottom: var(--common-px);">Your score: ${playerScore}</div>` : ''}
    <div class="scene-buttons">
        <button role="button" class="replay">Replay</button>
        <button role="button" class="menu">Main Menu</button>
    </div>
    `;
    won.classList.add('scene');
    document.body.appendChild(won);

    won.querySelector('.replay').addEventListener('click', () => {
        localStorage.setItem('replay', true);
        localStorage.setItem('difficulty', difficulty);
        location.reload();
    });

    won.querySelector('.menu').addEventListener('click', () => location.reload());

    messageInput.blur();
    clearInterval(timerId);
}

start.addEventListener('click', () => {
    mainMenu.remove();

    const difficultySelection = document.createElement('div');
    difficultySelection.innerHTML = `
    <h2>Choose the difficulty level</h2>
    <div class="scene-buttons">
        <button role="button" data-difficulty="easy" title="The bot will reply with words consisting of 3 to 5 letters">Easy</button>
        <button role="button" data-difficulty="medium" title="The bot will reply with words consisting of 7 to 10 letters">Medium</button>
        <button role="button" data-difficulty="hard" title="The bot will reply with words consisting of 10 to 13 letters">Hard</button>
        <button role="button" data-difficulty="expert" title="The bot will reply with words consisting of 13 to 16 letters">Expert</button>
    </div>
    `;
    difficultySelection.classList.add('scene');
    document.body.appendChild(difficultySelection);

    difficultySelection.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            difficulty = btn.getAttribute('data-difficulty');
            startTimer();
            messageInput.focus();
            currentDifficulty.innerHTML = currentDifficulty.innerHTML.replace('Unselected', btn.getAttribute('data-difficulty').replace(/^./, match => match.toUpperCase()));
            difficultySelection.remove();
        });
    });
});

if (localStorage.getItem('replay')) {
    mainMenu.remove();
    startTimer();
    messageInput.focus();
    difficulty = localStorage.getItem('difficulty');
    currentDifficulty.innerHTML = currentDifficulty.innerHTML.replace('Unselected', difficulty.replace(/^./, match => match.toUpperCase()));
    localStorage.removeItem('difficulty');
    localStorage.removeItem('replay');
}

function startTimer() {
    timerId = setInterval(() => {
        timer -= 0.1;
        time.innerHTML = timer.toFixed(1);
        timePercentage.style.width = `${(timer / defaultTimer) * 100}%`;
        if (timer <= 0) {
            time.innerHTML = '0';
            winningScene('bot');
            clearInterval(timerId);
        }
    }, 100);
}
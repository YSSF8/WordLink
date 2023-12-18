const messageInput = document.getElementById('message-input');
const sendMessage = document.getElementById('send-message');
const messageHistory = document.querySelector('.message-history');
const userMeter = document.querySelector('.user-meter');
const userMeterValue = userMeter.querySelector('.value');
const userMeterPercentage = userMeter.querySelector('.bar .percentage');
const botMeter = document.querySelector('.bot-meter');
const botMeterValue = botMeter.querySelector('.value');
const botMeterPercentage = botMeter.querySelector('.bar .percentage');
const meters = userMeter.closest('.meters');
const time = document.querySelector('.time');
const timePercentage = time.previousElementSibling;
const currentDifficulty = document.querySelector('.current-difficulty');
const letterInfo = document.querySelector('.letter-info');
const messageZone = messageInput.parentElement;
const mainMenu = document.querySelector('.main-menu');
const start = document.getElementById('start');
const coinCounter = document.getElementById('coin-counter');
const keyboard = document.querySelector('.keyboard');
const boughtItems = document.querySelectorAll('.bought-items button');

function fixMessageHistoryPadding() {
    messageHistory.style.paddingTop = `${meters.offsetHeight + 8}px`;
    requestAnimationFrame(fixMessageHistoryPadding);
}

fixMessageHistoryPadding();
coinCounter.innerHTML = parseInt(localStorage.getItem('coins')) || 0;

messageInput.addEventListener('input', () => {
    messageInput.value = messageInput.value.replace(/[^a-zA-Zé]/, '').replace(/^./, match => match.toUpperCase());
});

function fixRes() {
    if (window.matchMedia('(max-width: 600px)').matches) {
        if (!document.querySelector('.scene')) {
            messageInput.setAttribute('disabled', '');
        } else {
            messageInput.removeAttribute('disabled');
        }
        messageZone.style.bottom = `${keyboard.offsetHeight}px`;

        keyboard.querySelectorAll('.key').forEach(key => {
            if (messageInput.value.trim() != '') {
                key.innerHTML = key.innerHTML.toLowerCase();
            } else {
                if (key.innerHTML.indexOf('backspace') != -1) return;
                key.innerHTML = key.innerHTML.toUpperCase();
            }

            if (!key.hasAttribute('data-click-listener-added')) {
                key.addEventListener('click', () => {
                    if (messageInput.value == '') {
                        if (/<.+>backspace<\/.+>$/.test(key.innerHTML)) return;
                        messageInput.value += key.innerHTML.toUpperCase();
                    } else {
                        if (/<.+>backspace<\/.+>$/.test(key.innerHTML)) {
                            messageInput.value = messageInput.value.slice(0, -1);
                        } else {
                            messageInput.value += key.innerHTML.toLowerCase();
                        }
                    }
                });
                key.setAttribute('data-click-listener-added', '');
            }
        });

        let bought = [];
        let boughtCreations = 0;
        boughtItems.forEach(item => {
            boughtCreations++;
            bought.push(item);
            item.remove();
        });

        let combinedHeight = 0;
        Array.from(meters.children).forEach(child => {
            combinedHeight += child.offsetHeight;
        });

        meters.style.height = `calc(${combinedHeight}px + ${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--common-px')) * 2}px)`;

        const boughtItemsParent = meters.querySelector('.bought-items');
        if (boughtCreations >= 1 && !document.querySelector('.expand-items')) {
            const expandButton = document.createElement('button');
            expandButton.role = 'button';
            expandButton.classList.add('expand-items');
            expandButton.innerHTML = 'Items <span class="material-symbols-outlined expand-icon">expand_more</span>';
            meters.insertBefore(expandButton, boughtItemsParent);

            const expandIcon = expandButton.querySelector('span');
            let isExpanded = false;
            expandButton.addEventListener('click', () => {
                isExpanded = !isExpanded;

                if (isExpanded) {
                    expandIcon.style.transform = 'rotate(180deg)';
                    for (let i in bought) {
                        let clonedButton = bought[i].cloneNode(true);
                        attachItemEventListener(clonedButton);
                        boughtItemsParent.appendChild(clonedButton);
                    }
                } else {
                    expandIcon.style.transform = 'rotate(0)';
                    boughtItemsParent.innerHTML = '';
                }
            });
        }
    } else {
        messageInput.removeAttribute('disabled');
        messageZone.style.bottom = '0';
    }

    requestAnimationFrame(fixRes);
}

fixRes();

const MAX_SCORE = 70;
let difficulty = 'medium';
let defaultTimer = 15;
let timer = defaultTimer;
let playerScore = 0;
let botScore = 0;
let timeout = 3;
let usedWords = [];
let timerId;
let coins = parseInt(localStorage.getItem('coins')) || 0;
let chosenLetter = String.fromCharCode(Math.floor(Math.random() * (90 - 65 + 1)) + 65);
let earnings = {
    easy: 100,
    medium: 500,
    hard: 1000,
    expert: 2000
}
letterInfo.innerHTML = letterInfo.innerHTML.replace('?', chosenLetter);

window.addEventListener('DOMContentLoaded', () => {
    boughtItems.forEach(btn => {
        let savedItemValue = localStorage.getItem(btn.getAttribute('data-saved'));

        if (savedItemValue !== null && !isNaN(savedItemValue)) {
            btn.innerHTML = btn.innerHTML.replace('?', savedItemValue || '0');
            attachItemEventListener(btn);
        } else {
            localStorage.setItem(btn.getAttribute('data-saved'), '0');
            btn.innerHTML = btn.innerHTML.replace('?', '0');
        }
    });
});

function attachItemEventListener(btn) {
    btn.addEventListener('click', () => {
        let savedItem = parseInt(localStorage.getItem(btn.getAttribute('data-saved')));

        if (savedItem > 0) {
            savedItem--;
            localStorage.setItem(btn.getAttribute('data-saved'), savedItem);
            btn.innerHTML = btn.innerHTML.replace(/\d+/, savedItem);

            switch (btn.getAttribute('data-saved')) {
                case 'hint':
                    btn.setAttribute('disabled', '');
                    hint(chosenLetter).then(hints => {
                        const hintParent = document.createElement('div');
                        hintParent.style.left = '50%';
                        hintParent.style.transform = 'translateX(-50%)';
                        hintParent.style.position = 'fixed';
                        hintParent.style.width = 'max-content';
                        document.body.appendChild(hintParent);

                        for (let hint of hints) {
                            const hintItem = document.createElement('button');
                            hintItem.innerHTML = hint.replace(/^./, match => match.toUpperCase());
                            hintItem.classList.add('hint');
                            hintItem.role = 'button';
                            hintItem.style.marginLeft = 'calc(var(--common-px) / 2.5)';
                            hintParent.appendChild(hintItem);

                            hintItem.addEventListener('click', () => {
                                messageInput.value = hintItem.innerHTML;
                                btn.removeAttribute('disabled');
                                hintParent.remove();
                                sendMessage.click();
                            });
                        }

                        if (window.matchMedia('(max-width: 600px)').matches) {
                            hintParent.style.bottom = `${(messageInput.getBoundingClientRect().height + (hintParent.offsetHeight / 2)) + keyboard.offsetHeight}px`;
                        } else {
                            hintParent.style.bottom = `${messageInput.getBoundingClientRect().height + (hintParent.offsetHeight / 2)}px`;
                        }
                    });
                    break;
                case 'halfPoints':
                    pointManager('/');
                    break;
                case 'doublePoints':
                    pointManager('*');
                    break;
                case 'changeLetter':
                    changeLetter(String.fromCharCode(Math.floor(Math.random() * (90 - 65 + 1)) + 65));
                    break;
                case 'preferredLetter':
                    let previousLetter = chosenLetter;
                    let newLetter = prompt('Input your preferred letter').toUpperCase().trim();
                    let firstLetter = newLetter.charAt(0);
                    if (firstLetter.match(/[^a-zA-ZéÉ]/) || firstLetter.trim() == '') {
                        alert('Input a correct character');
                        incorrectLetter = previousLetter;
                    } else {
                        incorrectLetter = firstLetter;
                    }
                    changeLetter(incorrectLetter);
                    break;
                case 'stealPoints':
                    if (botScore <= 0) return;
                    updateScore('bot', -5);
                    updateScore('player', 5);
                    playerScore >= MAX_SCORE ? winningScene('player') : undefined;
                    break;
                case 'freezeTimer':
                    clearInterval(timerId);
                    break;
                case 'resetTimer':
                    timer = defaultTimer;
                    break;
                default:
                    sendNewMessage('An error occurred: Couldn\'t operate the item', true);
            }
        }

        async function hint(beginning = '', retries = 3) {
            while (retries) {
                try {
                    let response = await fetch(`https://random-word-api.herokuapp.com/word?number=100&length=${Math.floor(Math.random() * (11 - 8 + 1)) + 8}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    clearInterval(timerId);
                    let words = await response.json();
                    let filteredWords = words.filter(word => word.toUpperCase().startsWith(beginning.toUpperCase()));
                    if (filteredWords.length >= 3) {
                        let promises = filteredWords.slice(0, 3).map(async word => {
                            let response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                            if (!response.ok) {
                                if (response.status === 404) {
                                    console.log(`Word not found: ${word}`);
                                } else {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                            }
                            return response;
                        });
                        let responses = await Promise.all(promises);
                        let hints = responses.filter(response => response.ok).map((response, index) => filteredWords[index]);
                        if (hints.length >= 3) {
                            startTimer();
                            return hints;
                        } else {
                            return hint(beginning);
                        }
                    } else {
                        return hint(beginning);
                    }
                } catch (error) {
                    if (error.message === 'net::ERR_NETWORK_CHANGED' && retries > 0) {
                        retries--;
                        console.log(`Retrying... Attempts left: ${retries}`);
                    } else {
                        sendNewMessage(`An error occurred: ${error.message}`, true);
                        break;
                    }
                }
            }
        }

        function pointManager(operator) {
            if (operator == '/') {
                botScore = Math.floor(botScore / 2);
                botMeterValue.innerHTML = botScore < 10 ? `0${botScore}` : botScore;
                botMeterPercentage.style.width = `${(botScore / MAX_SCORE) * 100}%`;
            } else if (operator == '*') {
                playerScore *= 2;
                userMeterValue.innerHTML = playerScore < 10 ? `0${playerScore}` : playerScore;
                userMeterPercentage.style.width = `${(playerScore / MAX_SCORE) * 100}%`;
                playerScore >= MAX_SCORE ? winningScene('player') : undefined;
            }
        }

        function changeLetter(letter) {
            chosenLetter = letter;
            letterInfo.innerHTML = letterInfo.innerHTML.replace(/:\s.+/, `: ${chosenLetter}`);
        }
    });
}

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
            updateScore();
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
                sendNewMessage(`An error occurred: ${error.message}.<br>You have to <span onclick="location.reload();" class="fake-anchor">refresh</span> the page to continue again.`, true);
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
                    updateScore('bot', word.length);
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
        messageHistory.style.marginBottom = 'calc(var(--common-px) * 3)';

        messageHistory.querySelectorAll('.sent-message').forEach(message => {
            message.removeAttribute('style');
        });

        if (window.matchMedia('(max-width: 600px)').matches) {
            messageHistory.style.paddingBottom = `${keyboard.offsetHeight + messageZone.offsetHeight + 20}px`;
        } else {
            messageHistory.style.paddingBottom = '1in';
        }
    }
}

fixScrolling();

function smoothScroll() {
    window.scrollTo({
        top: document.body.scrollHeight,
        left: 0,
        behavior: 'smooth'
    });
}

function updateScore(agent = 'player', value = messageInput.value.length) {
    if (agent == 'player') {
        playerScore += value;
        userMeterValue.innerHTML = playerScore < 10 ? `0${playerScore}` : playerScore;
        userMeterPercentage.style.width = `${(playerScore / MAX_SCORE) * 100}%`;
    } else if (agent == 'bot') {
        botScore += value;
        botMeterValue.innerHTML = botScore < 10 ? `0${botScore}` : botScore;
        botMeterPercentage.style.width = `${(botScore / MAX_SCORE) * 100}%`;
    } else {
        throw new Error('Unknown agent');
    }
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
    ${agent == 'player' ? `<div>Reward: +${difficulty == 'easy' ? earnings.easy : (difficulty == 'hard' ? earnings.hard : (difficulty == 'expert' ? earnings.expert : earnings.medium))} coins</div>` : ''}
    <div ${agent == 'player' ? 'style="margin-bottom: var(--common-px);"' : ''}>Winner's score: ${agent == 'player' ? playerScore : botScore}</div>
    ${agent == 'bot' ? `<div style="margin-bottom: var(--common-px);">Your score: ${playerScore}</div>` : ''}
    <div class="scene-buttons">
        <button role="button" class="replay">Replay</button>
        <button role="button" class="menu">Main Menu</button>
    </div>
    ${agent == 'bot' ? `
    <div class="revive-container">
        <h3>Revive?</h3>
        <div class="revive-price">
            <img src="./assets/coin.png" height="30" draggable="false" alt="">
            <div>1000</div>
        </div>
        <div class="revive-meter">
            <div class="bar"></div>
        </div>
        <button role="button" class="revive">Revive</button>
    </div>
    ` : ''}
    `;
    won.classList.add('scene');
    document.body.appendChild(won);

    if (agent == 'player') {
        switch (difficulty) {
            case 'easy':
                coins += earnings.easy;
                localStorage.setItem('coins', coins);
                coinCounter.innerHTML = coins;
                break;
            case 'hard':
                coins += earnings.hard;
                localStorage.setItem('coins', coins);
                coinCounter.innerHTML = coins;
                break;
            case 'expert':
                coins += earnings.expert;
                localStorage.setItem('coins', coins);
                coinCounter.innerHTML = coins;
                break;
            default:
                coins += earnings.medium;
                localStorage.setItem('coins', coins);
                coinCounter.innerHTML = coins;
        }
    }

    won.querySelector('.replay').addEventListener('click', () => {
        localStorage.setItem('replay', true);
        localStorage.setItem('difficulty', difficulty);
        location.reload();
    });

    won.querySelector('.menu').addEventListener('click', () => location.reload());

    boughtItems.forEach(btn => btn.setAttribute('disabled', ''));

    const reviveBtn = won.querySelector('.revive');
    if (reviveBtn) {
        let price = parseInt(won.querySelector('.revive-price div').innerHTML);

        reviveBtn.addEventListener('click', () => {
            if (coins <= price) return;

            won.remove();
            timer = defaultTimer;
            startTimer();
            boughtItems.forEach(btn => btn.removeAttribute('disabled'));
            botScore -= Math.floor(MAX_SCORE / 2);
            botMeterValue.innerHTML = botScore < 10 ? `0${botScore}` : botScore;
            botMeterPercentage.style.width = `${(botScore / MAX_SCORE) * 100}%`;
            coins -= price;
            localStorage.setItem('coins', coins);
            coinCounter.innerHTML = coins;
        });

        let reviveTimeout = 100;
        let reviveId = setInterval(() => {
            reviveTimeout--;
            won.querySelector('.revive-meter .bar').style.width = `${reviveTimeout}%`;

            if (reviveTimeout <= 0) {
                won.querySelector('.revive-container').remove();
                clearInterval(reviveId);
            }
        }, 100);
    }

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

            boughtItems.forEach(btn => btn.removeAttribute('disabled'));
        });
    });
});

if (localStorage.getItem('replay')) {
    mainMenu.remove();
    startTimer();
    messageInput.focus();
    difficulty = localStorage.getItem('difficulty');
    currentDifficulty.innerHTML = currentDifficulty.innerHTML.replace('Unselected', difficulty.replace(/^./, match => match.toUpperCase()));
    boughtItems.forEach(btn => btn.removeAttribute('disabled'));
    localStorage.removeItem('difficulty');
    localStorage.removeItem('replay');
}

let openedStores = 0;

coinCounter.closest('.coins').addEventListener('click', () => {
    openedStores++;
    if (openedStores > 1) return;

    const store = document.createElement('div');
    store.classList.add('store');
    document.body.appendChild(store);

    store.innerHTML = `
    <div class="header">
        <div class="title">
            <img src="./assets/store.png" height="25" draggable="false" alt="">
            <div>Store</div>
        </div>
        <div class="close">
            <span class="material-symbols-outlined">close</span>
        </div>
    </div>
    <div class="content"></div>
    `;

    const content = store.querySelector('.content');

    fetch('./items.json')
        .then(res => res.json())
        .then(items => {
            let itemHTML = '';
            for (let item of items.sort((a, b) => a.price - b.price)) {
                let itemId = item.bought.match(/'(.*?)'/)[1];
                itemHTML += `
                <div class="item" title="${item.description}" data-price="${item.price}" data-bought="${eval(item.bought)}" data-item-id="${itemId}" id="${item.name.toLowerCase().replace(' ', '-')}">
                    <img src="${item.image}" height="120" draggable="false" alt="">
                    <div>${item.name}</div>
                    <sup style="color: #d9d9d9;">$${item.price}</sup>
                </div>
                `;
            }
            content.innerHTML = itemHTML;

            content.querySelectorAll('.item').forEach(item => {
                item.addEventListener('click', () => {
                    if (coins < parseInt(item.getAttribute('data-price'))) {
                        item.style.backgroundColor = '#8d2d2d';
                        setTimeout(() => {
                            item.style.removeProperty('background-color');
                        }, 500);
                        return;
                    }

                    coins -= item.getAttribute('data-price');
                    localStorage.setItem('coins', coins);
                    coinCounter.innerHTML = coins;

                    updateProperty(item.getAttribute('data-item-id'));

                    function updateProperty(key) {
                        let property = parseInt(localStorage.getItem(key) || '0');
                        property++;
                        localStorage.setItem(key, property.toString());

                        boughtItems.forEach(btn => {
                            if (btn.getAttribute('data-saved') === item.getAttribute('data-item-id')) {
                                let itemCount = localStorage.getItem(btn.getAttribute('data-saved'));
                                btn.innerHTML = btn.innerHTML.replace(/\d+/, itemCount);
                            }
                        });
                    }

                    item.style.backgroundColor = '#28591d';
                    setTimeout(() => {
                        item.style.removeProperty('background-color');
                    }, 500);
                });
            });
        })
        .catch(error => alert(`An error occurred: ${error.message}`));

    store.querySelector('.close').addEventListener('click', () => {
        store.remove();
        openedStores = 0;
    });
});

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
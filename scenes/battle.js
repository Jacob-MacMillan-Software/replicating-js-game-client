function setBattle(worldState) {
    let enemyDamage = 0;
    let playerDamage = 0;

    add([
        sprite('battle-background'),
        scale(1.3),
        pos(0,0)
    ])

    const enemyMon = add([
        sprite(worldState.enemyName + '-mon'),
        scale(5),
        pos(1300,100),
        opacity(1), 
        {
            fainted: false
        }
    ])
    enemyMon.flipX = true

    tween(
        enemyMon.pos.x, 
        1000, 
        0.3, 
        (val) => enemyMon.pos.x = val,
        easings.easeInSine
    )

    const playerMon = add([
        sprite('mushroom-mon'),
        scale(8),
        pos(-100, 300),
        opacity(1),
        {
            fainted: false
        }
    ])

    tween(
        playerMon.pos.x, 
        300, 
        0.3, 
        (val) => playerMon.pos.x = val, 
        easings.easeInSine
    )

    const playerMonHealthBox = add([
        rect(400, 100),
        outline(4),
        pos(1000, 400) 
    ])

    playerMonHealthBox.add([
        text('MUSHROOM', {size: 32}),
        color(10,10,10),
        pos(10, 10)
    ])

    playerMonHealthBox.add([
        rect(370, 10),
        color(200,200,200),
        pos(15, 50)
    ])

    const playerMonHealthBar = playerMonHealthBox.add([
        rect(370, 10),
        color(0,200,0),
        pos(15, 50)
    ])

    tween(playerMonHealthBox.pos.x, 850, 0.3, (val) => playerMonHealthBox.pos.x = val, easings.easeInSine)

    const enemyMonHealthBox = add([
        rect(400, 100),
        outline(4),
        pos(-100, 50) 
    ])

    enemyMonHealthBox.add([
        text(worldState.enemyName.toUpperCase(), {size: 32}),
        color(10,10,10),
        pos(10, 10)
    ])

    enemyMonHealthBox.add([
        rect(370, 10),
        color(200,200,200),
        pos(15, 50)
    ])

    const enemyMonHealthBar = enemyMonHealthBox.add([
        rect(370, 10),
        color(0,200,0),
        pos(15, 50)
    ])
    
    const maxHealth = enemyMonHealthBar.width;

    tween(enemyMonHealthBox.pos.x, 100, 0.3, (val) => enemyMonHealthBox.pos.x = val, easings.easeInSine)

    const box = add([
        rect(1300, 300),
        outline(4),
        pos(-2, 530)
    ])

    const content = box.add([
        text('MUSHROOM is ready to battle!', { size: 42}),
        color(10,10,10),
        pos(20,20)
    ])

    function reduceHealth(healthBar, damageDealt) {
        tween(
            healthBar.width,
            healthBar.width - damageDealt,
            0.5,
            (val) => healthBar.width = val,
            easings.easeInSine
        )
    }

    function makeMonFlash(mon) {
        tween(
            mon.opacity,
            0,
            0.3,
            (val) => {
                mon.opacity = val
                if (mon.opacity === 0) {
                    mon.opacity = 1
                }
            },
            easings.easeInBounce
        )
    }

    let phase = 'player-selection'
    onKeyPress('space', () => {
        if (playerMon.fainted || enemyMon.fainted) return

        if (phase === 'player-selection') {
            content.text = '> Tackle'
            phase = 'player-turn'
            return
        }

        if (phase === 'enemy-turn') {
            content.text = worldState.enemyName.toUpperCase() + ' attacks!'
            const damageDealt = enemyDamage;

            if (damageDealt > 150) {
                content.text = "It's a critical hit!"
            }

            reduceHealth(playerMonHealthBar, damageDealt)
            makeMonFlash(playerMon)

            phase = 'player-selection'
            
            // Inform server of damage and ask for new enemy health
            // TODO Inform server of player's damage

            return
        }

        if (phase === 'player-turn') {
            const damageDealt = playerDamage;

            if (damageDealt > 150) {
                content.text = "It's a critical hit!"
            } else {
                content.text = 'MUSHROOM used tackle.'
            }

            reduceHealth(enemyMonHealthBar, damageDealt)
            makeMonFlash(enemyMon)
            
            // Inform server of damage and ask for new enemy health
            window.socket.send(`damage:${worldState.enemyName}`);

            phase = 'enemy-turn'
        }
    })

    function colorizeHealthBar(healthBar) {
        if (healthBar.width < 200) {
            healthBar.use(color(250, 150, 0))
        }

        if (healthBar.width < 100) {
            healthBar.use(color(200, 0, 0))
        }

    }

    function makeMonDrop(mon) {
        tween(
            mon.pos.y,
            800,
            0.5,
            (val) => mon.pos.y = val,
            easings.easeInSine
        )
    }

    onUpdate(() => {
        colorizeHealthBar(playerMonHealthBar)
        colorizeHealthBar(enemyMonHealthBar)

        if (enemyMonHealthBar.width < 0 && !enemyMon.fainted) {
            makeMonDrop(enemyMon)
            content.text = worldState.enemyName.toUpperCase() + ' fainted!'
            enemyMon.fainted = true
            setTimeout(() => {
                content.text = 'MUSHROOM won the battle!'
            }, 1000)
            setTimeout(() => {
                worldState.faintedMons.push(worldState.enemyName)
                go('world', worldState)
            }, 2000)
        }

        if (playerMonHealthBar.width < 0 && !playerMon.fainted) {
            makeMonDrop(playerMon)
            content.text = 'MUSHROOM fainted!'
            playerMon.fainted = true
            setTimeout(() => {
                content.text = 'You rush to get MUSHROOM healed!'
            }, 1000)
            setTimeout(() => {
                worldState.playerPos = vec2(500,700)
                go('world', worldState)
            }, 2000)
        }
    })
    

    const otherPlayers = {};

    function handleMessage(message) {
        if(!message) return false;

        console.log(`Got message ${message}`);

        // Handle the ID message
        if(message.split(':')[0] === 'id') {
            clientId = message.split(':')[1];
            return true;
        }

        // Handle connection of other players
        if(message.split(':')[0] === 'connected') {
            const id = message.split(':')[1];
            if (id === clientId || otherPlayers[id]) return false;
            console.log(`${id} has connected!`);
            return true;
        }

        // Handle disconnection of other players
        if(message.split(':')[0] === 'disconnected') {
            const id = message.split(':')[1];
            console.log(`${id} has disconnected!`);
            return true;
        }
        
        if(message.split(':')[0] === 'health') {
            const enemy = message.split(':')[1];
            const [health, nextEnemyDamage, nextPlayerDamage] = message.split(':')[2].split(',');
            
            if (enemy === worldState.enemyName) {
                reduceHealth(enemyMonHealthBar, (maxHealth - health));
            }
            
            enemyDamage = nextEnemyDamage;
            playerDamage = nextPlayerDamage;
            
            console.log(`${enemy} has ${health} health!`);
            return true;
        }
        
        console.log('not handled!')
        return false;
    }

    window.setupHandler((event) => {
        handleMessage(event.data);
    })

    // request the current monster health from the server
    window.socket.send(`health:${worldState.enemyName}`);


}


// vim: set tabstop=4 shiftwidth=4 expandtab:

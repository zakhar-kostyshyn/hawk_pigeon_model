import React, {useEffect, useState} from 'react';
import {Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis} from 'recharts'
import './App.css';

const startDNAPoints = 50
const startBirdsCount = 10
const circlesCount = 400


interface Action {
    action: (pair: BirdPair) => BirdPair
}

class RollAction implements Action {

    win: number
    lose: number

    constructor(win: number, lose: number) {
        this.win = win
        this.lose = lose
    }

    action(pair: BirdPair): BirdPair {
        if (Math.random() < 0.5) {
            pair.firstBird = new Bird(pair.firstBird.strategy, pair.firstBird.DNAPoints + this.win)
            pair.secondBird = new Bird(pair.secondBird.strategy, pair.secondBird.DNAPoints - this.lose)
        } else {
            pair.firstBird = new Bird(pair.firstBird.strategy, pair.firstBird.DNAPoints - this.lose)
            pair.secondBird = new Bird(pair.secondBird.strategy, pair.secondBird.DNAPoints + this.win)
        }
        return pair
    }

}

class AutoWinToAutoLose implements Action {

    isStrategyOwnerWin: boolean
    win: number
    lose: number

    constructor(isFirstBirdWin: boolean, win: number, lose: number) {
        this.isStrategyOwnerWin = isFirstBirdWin
        this.win = win
        this.lose = lose
    }

    action(pair: BirdPair): BirdPair {
        if (this.isStrategyOwnerWin) {
            pair.firstBird = new Bird(pair.firstBird.strategy, pair.firstBird.DNAPoints + this.win)
            pair.secondBird = new Bird(pair.secondBird.strategy, pair.secondBird.DNAPoints - this.lose)
        } else {
            pair.firstBird = new Bird(pair.firstBird.strategy, pair.firstBird.DNAPoints - this.lose)
            pair.secondBird = new Bird(pair.secondBird.strategy, pair.secondBird.DNAPoints + this.win)
        }
        return pair
    }

}

enum StrategyType {
    AlwaysAttack, RunAwayWhenGetAttacked, AttackOnlyForRebuff, AlwaysAttackButRunAwayOnRebuff
}

interface Strategy {
    ownStrategyType: StrategyType
    enemyStrategyType2NeededAction: Map<StrategyType, Action>
}

class Attacker implements Strategy {
    ownStrategyType = StrategyType.AlwaysAttack
    enemyStrategyType2NeededAction = new Map([
        [StrategyType.AlwaysAttack, new RollAction(50, 100)],
        [StrategyType.RunAwayWhenGetAttacked, new AutoWinToAutoLose(true, 50, 100)],
        [StrategyType.AttackOnlyForRebuff, new RollAction(50, 100)],
        [StrategyType.AlwaysAttackButRunAwayOnRebuff, new AutoWinToAutoLose(true, 50, 0)],
    ])
}

class Saver implements Strategy {
    ownStrategyType = StrategyType.RunAwayWhenGetAttacked
    enemyStrategyType2NeededAction = new Map([
        [StrategyType.AlwaysAttack, new AutoWinToAutoLose(false, 50, 0)],
        [StrategyType.RunAwayWhenGetAttacked, new RollAction(50, 15)],
        [StrategyType.AttackOnlyForRebuff, new RollAction(50, 15)],
        [StrategyType.AlwaysAttackButRunAwayOnRebuff, new AutoWinToAutoLose(false, 50, 0)],
    ])
}

class AttackerSaver implements Strategy {
    ownStrategyType = StrategyType.AlwaysAttackButRunAwayOnRebuff
    enemyStrategyType2NeededAction = new Map([
        [StrategyType.AlwaysAttack, new AutoWinToAutoLose(false, 50, 0)],
        [StrategyType.RunAwayWhenGetAttacked, new AutoWinToAutoLose(true, 50, 0)],
        [StrategyType.AttackOnlyForRebuff, new AutoWinToAutoLose(false, 50, 0)],
        [StrategyType.AlwaysAttackButRunAwayOnRebuff, new RollAction(50, 15)],
    ])
}

class SaverAttacker implements Strategy {
    ownStrategyType = StrategyType.AttackOnlyForRebuff
    enemyStrategyType2NeededAction = new Map([
        [StrategyType.AlwaysAttack, new RollAction(50, 100)],
        [StrategyType.RunAwayWhenGetAttacked, new RollAction(50, 15)],
        [StrategyType.AttackOnlyForRebuff, new RollAction(50, 15)],
        [StrategyType.AlwaysAttackButRunAwayOnRebuff, new AutoWinToAutoLose(true, 50, 0)],
    ])
}

class Bird {
    strategy: Strategy
    DNAPoints: number

    constructor(strategy: Strategy, dnaPoints: number) {
        this.strategy = strategy
        this.DNAPoints = dnaPoints
    }
}

class BirdPair {
    firstBird: Bird
    secondBird: Bird

    constructor(firstBird: Bird, secondBird: Bird) {
        this.firstBird = firstBird
        this.secondBird = secondBird
    }

}

type ChartData = {
    name: string,
    attackers: number,
    savers: number,
    attackerSavers: number,
    saverAttackers: number
}[]

export default function App() {



    const [chartData, setChart]: [ChartData, (setState: ChartData) => void] = useState([{
        name: "0",
        attackers: startBirdsCount,
        savers: startBirdsCount,
        attackerSavers: startBirdsCount,
        saverAttackers: startBirdsCount
    }])

    function logic() {

        let localChart: ChartData = chartData
        let birds = Object.values({
            Attacker: new Attacker(),
            Saver: new Saver(),
            SaverAttacker: new AttackerSaver(),
            AttackerSaver: new SaverAttacker()
        })
            .flatMap(type => Array(startBirdsCount).fill(new Bird(type, startDNAPoints)))
            .sort(() => Math.random() - 0.5)

        for (let i = 1; i < circlesCount; i++) {

            birds = birds
                .reduce((result, value, index, source) => {
                    if (index % 2 === 0) {
                        if (index === source.length - 1) return [...result, source[index]]
                        return [...result, new BirdPair(source[index], source[index + 1])]
                    } else return result
                }, Array<BirdPair | Bird>())
                .map((pairOrBird: BirdPair | Bird) => {
                    if (pairOrBird instanceof BirdPair) {
                        return pairOrBird.firstBird.strategy.enemyStrategyType2NeededAction.get(pairOrBird.secondBird.strategy.ownStrategyType)?.action(pairOrBird)!!
                    } else {
                        return pairOrBird
                    }
                })
                .flatMap((pairOrBird: BirdPair | Bird) => pairOrBird instanceof BirdPair ? [pairOrBird.firstBird, pairOrBird.secondBird] : [pairOrBird])


            localChart = [...localChart,  {
                name: `${i}`,
                attackers: getSumBy(StrategyType.AlwaysAttack, birds),
                savers: getSumBy(StrategyType.RunAwayWhenGetAttacked, birds),
                attackerSavers: getSumBy(StrategyType.AlwaysAttackButRunAwayOnRebuff, birds),
                saverAttackers: getSumBy(StrategyType.AttackOnlyForRebuff, birds)
            }]

        }

        setChart(localChart)

    }

    function getSumBy(strategyType: StrategyType, birds: Array<Bird>): number {
        return birds.filter(bird => bird.strategy.ownStrategyType === strategyType)
            .map(bird => bird.DNAPoints)
            .reduce((result, value) => {
                result += value
                return result
            })
    }

    useEffect(() => {
        logic()
    }, []);


    return (
        <div>
            <AreaChart width={2000} height={700} data={chartData}
                       margin={{top: 100, right: 100, left: 0, bottom: 0}}>
                <defs>
                    <linearGradient id="colorAttackers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0526fc" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0526fc" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSavers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff0000" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ff0000" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAttackerSavers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#05fc05" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#05fc05" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSaverAttacker" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000000" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name"/>
                <YAxis/>
                <CartesianGrid strokeDasharray="3 3"/>
                <Tooltip/>
                <Area type="monotone" dataKey="attackers" stroke="#0526fc" fill="url(#colorAttackers)"/>
                <Area type="monotone" dataKey="savers" stroke="#ff0000" fill="url(#colorSavers)"/>
                <Area type="monotone" dataKey="attackerSavers" stroke="#05fc05" fill="url(#colorAttackerSavers)"/>
                <Area type="monotone" dataKey="saverAttackers" stroke="#000000" fill="url(#colorSaverAttacker)"/>
            </AreaChart>
        </div>
    )
}


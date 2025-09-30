class WeatherModel extends MarkovChain {
    constructor() {
        super({
            name: "Weather Model",
            description: "A simple weather prediction model with three states",
            states: [0, 1, 2],
            stateNames: ['Sunny', 'Cloudy', 'Rainy'],
            transitionMatrix: [
                [0.7, 0.2, 0.1],
                [0.3, 0.4, 0.3],
                [0.2, 0.4, 0.4]
            ],
            initialDistribution: [1.0, 0.0, 0.0]
        });
    }

    getTheoreticalSteadyState() {
        return [0.438, 0.287, 0.275];
    }
}

chainModules.push(WeatherModel);
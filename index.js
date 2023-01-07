import { loadCountriesData, loadSomeCountriesData, getCounter, resetCounter } from '/api.js';
import Maps from '/maps.js';

const form = document.getElementById('form');
const fromCountry = document.getElementById('fromCountry');
const toCountry = document.getElementById('toCountry');
const countriesList = document.getElementById('countriesList');
const submit = document.getElementById('submit');
const output = document.getElementById('output');

// eslint-disable-next-line no-unused-vars
const findPaths = async (from, to, maxIteration) => {
    const countries = [
        {
            data: from,
            parent: null,
            level: 0,
            bordersToHandle: from.borders,
        },
    ];
    let iteration = 0;
    const routes = [];
    const handled = new Set(); // save the codes that have been handled

    // function to handle borders
    const handleBorders = async () => {
        if (countries.length === 0) {
            throw new Error('Path not found');
        }
        if (iteration > maxIteration) {
            throw new Error('Path very long...');
        }
        const country = countries.shift();
        iteration = country.level + 1;
        handled.add(country.data.cca3);

        // find countries
        if (country.data.borders.includes(to.cca3)) {
            routes.push(country);
            // find other countries in the same level
            for (const item of countries) {
                if (item.level !== country.level) {
                    break;
                }
                if (item.data.borders.includes(to.cca3)) {
                    routes.push(item);
                }
            }
            return;
        }

        // if not find load borders for all countries
        try {
            const nextCountries = await loadSomeCountriesData(country.bordersToHandle);
            // delete duplicates and push to queue
            for (const key of Object.keys(nextCountries)) {
                if (
                    !countries.find((item) => item.data.cca3 === nextCountries[key].cca3) ||
                    !handled.has(nextCountries[key].cca3)
                ) {
                    const bordersToHandle = nextCountries[key].borders.filter(
                        (item) => !handled.has(item) && !country.data.borders.includes(item)
                    );
                    if (bordersToHandle.length > 0) {
                        countries.push({
                            data: nextCountries[key],
                            parent: country,
                            level: country.level + 1,
                            bordersToHandle,
                        });
                    }
                }
            }
        } catch (error) {
            throw new Error('Something went wrong, please update the page and try again');
        }

        // call self
        await handleBorders();
    };

    // function to calc path
    const calcPath = () => {
        const result = [];
        for (const item of routes) {
            const path = [to.name.common];
            let country = item;
            while (country !== null) {
                path.push(country.data.name.common);
                country = country.parent;
            }
            result.push(path);
        }
        return result;
    };

    const result = [];
    await handleBorders();
    if (routes.length === 0) {
        throw Error('Path not found');
    }
    const paths = calcPath();
    for (let i = 0; i < paths.length; i++) {
        result.push(paths[i].reverse().join(' -> '));
    }
    return result;
};

async function findRoute(from, to) {
    if (from.borders.length === 0) {
        throw new Error('Path not found');
    }
    if (from === to) {
        throw new Error('Please, enter different countries');
    }
    try {
        Maps.setEndPoints(from.cca3, to.cca3);
        const queue = [from];
        const visited = new Set();
        visited.add(from.cca3);
        const parents = new Map();
        parents.set(from.cca3, null);

        while (queue.length > 0) {
            const country = queue.shift();

            if (country.borders.length > 0) {
                if (country.borders.includes(to.cca3)) {
                    parents.set(to.cca3, country);
                    break;
                }

                // eslint-disable-next-line no-await-in-loop
                const borders = await loadSomeCountriesData(country.borders);

                for (const border of Object.keys(borders)) {
                    if (!visited.has(border)) {
                        visited.add(border);
                        queue.push(borders[border]);
                        parents.set(border, country);
                        Maps.markAsVisited([border]);
                    }
                }
            }
        }

        if (!parents.has(to.cca3)) {
            throw new Error('Path not found');
        }

        const result = [];
        let parent = parents.get(to.cca3);
        const path = [to.name.common];
        while (parent !== null) {
            path.push(parent.name.common);
            parent = parents.get(parent.cca3);
        }
        result.push(path.reverse().join(' -> '));

        return result;
    } catch (error) {
        throw error;
    }
}

(async () => {
    fromCountry.disabled = true;
    toCountry.disabled = true;
    submit.disabled = true;

    output.textContent = 'Loading…';
    const countriesData = await loadCountriesData();
    output.textContent = '';

    // Заполняем список стран для подсказки в инпутах
    Object.keys(countriesData)
        .sort((a, b) => countriesData[b].area - countriesData[a].area)
        .forEach((code) => {
            const option = document.createElement('option');
            option.value = countriesData[code].name.common;
            countriesList.appendChild(option);
        });

    fromCountry.disabled = false;
    toCountry.disabled = false;
    submit.disabled = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!fromCountry.value) {
            output.textContent = 'Please fill the "From" field';
            return;
        }
        if (!toCountry.value) {
            output.textContent = 'Please fill the "To" field';
            return;
        }

        const fromCountryValue = Object.values(countriesData).find((item) => item.name.common === fromCountry.value);
        if (!fromCountryValue) {
            output.textContent = 'Invalid "From" parameter, please check';
            return;
        }

        const toCountryValue = Object.values(countriesData).find((item) => item.name.common === toCountry.value);
        if (!toCountryValue) {
            output.textContent = 'Invalid "To" parameter, please check';
            return;
        }

        output.textContent = 'Calculating…';
        fromCountry.disabled = true;
        toCountry.disabled = true;
        submit.disabled = true;

        try {
            const MAX_ITERATION = 10;
            // reset counter
            resetCounter();
            // find path
            // const paths = await findPaths(fromCountryValue, toCountryValue, MAX_ITERATION);
            const paths = await findRoute(fromCountryValue, toCountryValue, MAX_ITERATION);
            // show result
            output.textContent = '';
            const requestCount = document.createElement('p');
            requestCount.textContent = `Request count: ${getCounter()} \n `;
            output.appendChild(requestCount);
            for (let i = 0; i < paths.length; i++) {
                const path = document.createElement('p');
                path.textContent = paths[i];
                output.appendChild(path);
            }
        } catch (error) {
            output.textContent = error.message;
        }

        fromCountry.disabled = false;
        toCountry.disabled = false;
        submit.disabled = false;
    });
})();

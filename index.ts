import { loadCountriesData, loadSomeCountriesData, getCounter, resetCounter, CountryData } from './api';

const form = document.getElementById('form') as HTMLFormElement | null;
const fromCountry = document.getElementById('fromCountry') as HTMLInputElement | null;
const toCountry = document.getElementById('toCountry') as HTMLInputElement | null;
const countriesList = document.getElementById('countriesList') as HTMLDataListElement | null;
const submit = document.getElementById('submit') as HTMLButtonElement | null;
const output = document.getElementById('output') as HTMLDivElement | null;

const findPaths = async (from: CountryData, to: CountryData, maxIteration: number) => {
    type CountryPathData = {
        data: CountryData;
        parent: CountryPathData | null;
        level: number;
        bordersToHandle: Array<string>;
    };
    type CountriesPathData = Array<CountryPathData>;

    const countries: CountriesPathData = [
        {
            data: from,
            parent: null,
            level: 0,
            bordersToHandle: from.borders,
        },
    ];
    let iteration = 0;
    const routes: Array<CountryPathData> = [];
    const handled = new Set<string>(); // save the codes that have been handled

    // function to handle borders
    const handleBorders = async (): Promise<void> => {
        if (countries.length === 0) {
            throw new Error('Path not found');
        }
        if (iteration > maxIteration) {
            throw new Error('Path very long...');
        }
        const country = countries.shift();

        if (!country) {
            throw new Error('Path not found');
        }

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
    const calcPath = (): Array<Array<string>> => {
        const result: Array<Array<string>> = [];
        for (const item of routes) {
            const path: Array<string> = [to.name.common];
            let country: CountryPathData | null = item;
            while (country !== null) {
                path.push(country.data.name.common);
                country = country.parent;
            }
            result.push(path);
        }
        return result;
    };

    const result: Array<string> = [];
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

(async () => {
    if (!fromCountry || !toCountry || !submit || !output || !countriesList || !form) {
        return;
    }
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
            const paths = await findPaths(fromCountryValue, toCountryValue, MAX_ITERATION);
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
            function isError(error: Error | unknown): error is Error {
                return (error as Error).message !== undefined;
            }
            if (isError(error)) {
                output.textContent = error.message;
            }
        }

        fromCountry.disabled = false;
        toCountry.disabled = false;
        submit.disabled = false;
    });
})();

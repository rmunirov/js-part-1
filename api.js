async function getData(url) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
    });
    if (!response.ok) {
        throw new Error('Network response was not OK');
    }
    return response.json();
}

const cache = new Map();
let counter = 0;

export function getCounter() {
    return counter;
}

export function resetCounter() {
    counter = 0;
}

export async function loadCountriesData() {
    const countries = await getData(
        'https://restcountries.com/v3.1/all?fields=name&fields=cca3&fields=area&fields=borders'
    );
    return countries.reduce((result, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

export async function loadCountryData(code) {
    if (cache.has(code)) {
        return cache.get(code);
    }
    const country = await getData(
        `https://restcountries.com/v3.1/alpha/${code}?fields=name&fields=cca3&fields=area&fields=borders`
    );
    cache.set(code, country);
    counter += 1;
    return country;
}

export async function loadSomeCountriesData(codes) {
    if (!Array.isArray(codes) || codes.length <= 0) {
        throw new Error('Bad parameters passed');
    }
    const requests = codes.map((code) => loadCountryData(code));
    const responses = await Promise.all(requests);
    return responses.reduce((result, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

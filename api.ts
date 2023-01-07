async function getData<T>(url: string): Promise<T> {
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

const cache = new Map<string, CountryData>();
let counter = 0;

export function getCounter(): number {
    return counter;
}

export function resetCounter(): void {
    counter = 0;
}

type CountryName = {
    common: string;
    official: string;
    nativeName: CountryNativeName;
};

type CountryNativeName = {
    bar: CountryBarName;
};

type CountryBarName = {
    official: string;
    common: string;
};

export type CountryData = {
    name: CountryName;
    cca3: string;
    capital: string[];
    altSpellings: string[];
    borders: string[];
    area: number;
};

export type CountriesData = {
    [key: string]: CountryData;
};

export async function loadCountriesData(): Promise<CountriesData> {
    const countries = await getData<Array<CountryData>>(
        'https://restcountries.com/v3.1/all?fields=name&fields=cca3&fields=area&fields=borders'
    );
    return countries.reduce((result: CountriesData, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

export async function loadCountryData(code: string): Promise<CountryData> {
    if (cache.has(code)) {
        const result = cache.get(code);
        if (result) {
            return result;
        }
    }
    const country = await getData<CountryData>(
        `https://restcountries.com/v3.1/alpha/${code}?fields=name&fields=cca3&fields=area&fields=borders`
    );
    cache.set(code, country);
    counter += 1;
    return country;
}

export async function loadSomeCountriesData(codes: Array<string>): Promise<CountriesData> {
    if (codes.length <= 0) {
        throw new Error('Bad parameters passed');
    }
    const requests = codes.map((code) => loadCountryData(code));
    const responses = await Promise.all(requests);
    return responses.reduce((result: CountriesData, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

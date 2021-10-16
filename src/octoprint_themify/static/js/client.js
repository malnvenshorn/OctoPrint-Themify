const BASE_URL = 'plugin/themify/api';

export default class Client {
    static getThemeList(opts = {}) {
        return OctoPrint.get(`${BASE_URL}/themes`, opts);
    }

    static getTheme(theme, opts = {}) {
        return OctoPrint.get(`${BASE_URL}/themes/${theme}`, { dataType: 'text', ...opts });
    }

    static deleteTheme(theme, opts = {}) {
        return OctoPrint.delete(`${BASE_URL}/themes/${theme}`, opts);
    }

    static saveTheme(theme, data, opts = {}) {
        return OctoPrint.post(`${BASE_URL}/themes/${theme}`, data, { contentType: 'application/text', ...opts });
    }
}

import axios from "axios";

const prodUrl = window.location.protocol + '//' + window.location.host + '/api';
const devUrl = 'https://localhost:7122/api/';

const isElectron = window.navigator.userAgent.includes('Electron');
//const envi = process.env.NODE_ENV;

const getBaseUrl = () => {
    //if(isElectron || envi === 'production')
        //return prodUrl;

    //if(envi === 'development')
        //return devUrl;

    //return prodUrl;
    return "http://localhost:8001/api/"
}

const API_URL = getBaseUrl();
export const client = axios.create({baseURL: API_URL, withCredentials: false});
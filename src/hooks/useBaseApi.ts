import { useEffect, useState } from "react";
import { base_api } from "../utils/request";

export function useBaseApi() {
    const [baseApi, setBaseApi] = useState("");

    useEffect(() => {
        base_api().then(setBaseApi);
    }, []);

    return baseApi;
}
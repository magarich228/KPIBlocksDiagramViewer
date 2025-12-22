import {client} from "../../shared/api"

const basePath = 'repo';
const spiderPath = `${basePath}/spider`;

export const spiderApi = {
    spider(repoPath: string, branch: string) {
        return client.post(spiderPath, {
            repoPath: repoPath,
            branch: branch
        }).then(res => res.data);
    }
}
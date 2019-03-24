import {ChildProcess, spawn} from "child_process";

export default class Client {
    private sender: any;
    private buffer: Array<any> = [];
    private proc: ChildProcess | undefined;

    constructor(sender: any) {
        this.sender = sender;

        this.proc = spawn("./bin/escape-proxy-mac", ["client", "-c", `"/tmp/ex.yaml"`], {shell: true});
        this.proc.stdout.on("data", (data) => {
            const text = this.getLine(data).trim();
            if (text.length === 0) {
                return;
            }
            const json = JSON.parse(text);
            console.log(json);

            if (json.title) {
                if (json.title === "START UP") {
                    sender.send("connect-success", {
                        data: json.value,
                        message: data.toString(),
                    });
                } else {
                    sender.send("connect-info", {
                        data: json,
                        message: data.toString(),
                    });
                }
            } else {
                sender.send("connect-error", {
                    message: "json parse error",
                });
            }
        });

        this.proc.stderr.on("data", (data) => {
            sender.send("connect-error", {
                message: data.toString(),
            });
        });

        this.proc.on("close", (code) => {
            console.log("ERROR", code);
            sender.send("connect-error", {
                message: String(code),
            });
        });
    }

    private getLine(buffer: any): string {
        for (let i = 0; i < buffer.length; i++) {
            const c = String.fromCharCode(buffer[i]);
            if (c == "\n") {
                const returnStringBuffer = Buffer.alloc(this.buffer.length);
                returnStringBuffer.set(this.buffer, 0);
                this.buffer = [];
                return returnStringBuffer.toString();
            }
            this.buffer.push(buffer[i]);
        }
        return "";
    }

    private sendError() {

    }

    public disconnect() {
        if (this.proc === undefined) {
            return;
        }
        this.proc.kill("SIGTERM");
        this.sender.send("connect-exit", undefined);
    }
}

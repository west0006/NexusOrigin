import { OpenClawDriver } from './agent-driver/openclaw.driver';
import { LangGraphDriver } from './agent-driver/langgraph.driver';
import { CrewAIDriver } from './agent-driver/crewai.driver';
import { Framework, AgentDriver } from './agent-driver/interface';
import { DeploymentConfig } from '@shared/types/environment';

export class DeploymentService {
    private drivers: Record<Framework, AgentDriver> = {
        openclaw: new OpenClawDriver(),
        langgraph: new LangGraphDriver(),
        crewai: new CrewAIDriver(),
    };

    async install(framework: Framework, config: DeploymentConfig): Promise<string> {
        const driver = this.drivers[framework];
        const result = await driver.install(config);
        return result.path;
    }

    async start(framework: Framework): Promise<void> {
        const driver = this.drivers[framework];
        await driver.start();
    }

    async stop(framework: Framework): Promise<void> {
        const driver = this.drivers[framework];
        await driver.stop();
    }

    async getStatus(framework: Framework) {
        const driver = this.drivers[framework];
        return driver.getStatus();
    }
}
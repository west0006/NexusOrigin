import { AgentDriver } from './interface';
import { OpenClawDriver } from './openclaw.driver';
import { LangGraphDriver } from './langgraph.driver';
import { CrewAIDriver } from './crewai.driver';

export type Framework = 'openclaw' | 'langgraph' | 'crewai';

export function getDriver(framework: Framework): AgentDriver {
    switch (framework) {
        case 'openclaw':
            return new OpenClawDriver();
        case 'langgraph':
            return new LangGraphDriver();
        case 'crewai':
            return new CrewAIDriver();
        default:
            throw new Error(`Unsupported framework: ${framework}`);
    }
}
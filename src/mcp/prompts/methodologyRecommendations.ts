/**
 * Analyzes project description and recommends top 3 methodologies
 */

interface MethodologyRecommendation {
  value: string;
  title: string;
  reason: string;
}

export function recommendMethodologies(projectDescription: string): MethodologyRecommendation[] {
  const lower = projectDescription.toLowerCase();
  
  // Game development
  if (lower.includes('game') || lower.includes('unity') || lower.includes('unreal') || lower.includes('physics')) {
    return [
      { value: 'tdd', title: '2. Test-Driven Development (TDD)', reason: 'Essential for game physics and mechanics - write tests first to ensure consistent behavior' },
      { value: 'rapid', title: '9. Rapid Prototyping', reason: 'Perfect for quickly testing gameplay ideas and iterating on what feels fun' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Flexible sprints help adapt to playtest feedback and changing design decisions' }
    ];
  }
  
  // Landing page / marketing site
  if (lower.includes('landing') || lower.includes('marketing') || lower.includes('website') || lower.includes('homepage')) {
    return [
      { value: 'rapid', title: '9. Rapid Prototyping', reason: 'Get a working page live quickly to gather user feedback and conversion data' },
      { value: 'kanban', title: '5. Kanban / Continuous Flow', reason: 'Perfect for ongoing content updates and A/B testing improvements' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Quick iterations based on analytics and user behavior' }
    ];
  }
  
  // API / Backend service
  if (lower.includes('api') || lower.includes('backend') || lower.includes('service') || lower.includes('microservice')) {
    return [
      { value: 'tdd', title: '2. Test-Driven Development (TDD)', reason: 'Critical for API reliability - write endpoint tests before implementation' },
      { value: 'bdd', title: '3. Behavior-Driven Development (BDD)', reason: 'Great for defining API contracts and expected behaviors with stakeholders' },
      { value: 'devops', title: '8. DevOps / Platform Engineering', reason: 'Automates deployment, monitoring, and infrastructure management' }
    ];
  }
  
  // Mobile app (iOS/Android)
  if (lower.includes('ios') || lower.includes('android') || lower.includes('mobile') || lower.includes('app store')) {
    return [
      { value: 'tdd', title: '2. Test-Driven Development (TDD)', reason: 'Essential for mobile stability - write tests to prevent crashes in production' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Ship features incrementally and adapt to user reviews and app store feedback' },
      { value: 'lean', title: '6. Lean Startup', reason: 'Validate features with real users before investing in full development' }
    ];
  }
  
  // Startup / MVP
  if (lower.includes('startup') || lower.includes('mvp') || lower.includes('minimum viable')) {
    return [
      { value: 'lean', title: '6. Lean Startup', reason: 'Build only what you need to validate your core hypothesis with real users' },
      { value: 'rapid', title: '9. Rapid Prototyping', reason: 'Get something in users\' hands fast to test your assumptions' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Pivot quickly based on user feedback and market validation' }
    ];
  }
  
  // Enterprise / Corporate
  if (lower.includes('enterprise') || lower.includes('corporate') || lower.includes('compliance') || lower.includes('audit')) {
    return [
      { value: 'enterprise', title: '10. Enterprise / Governance', reason: 'Built for compliance requirements, review processes, and audit trails' },
      { value: 'waterfall', title: '4. Waterfall', reason: 'Fixed requirements and milestones work well for large organizations' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Even enterprises benefit from iterative delivery and adaptability' }
    ];
  }
  
  // Complex business domain
  if (lower.includes('domain') || lower.includes('business logic') || lower.includes('complex') || lower.includes('workflow')) {
    return [
      { value: 'ddd', title: '7. Domain-Driven Design (DDD)', reason: 'Perfect for untangling complex business rules with a shared domain language' },
      { value: 'bdd', title: '3. Behavior-Driven Development (BDD)', reason: 'Keeps business stakeholders and engineers aligned on expected behaviors' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Iterative approach helps refine understanding of complex domains' }
    ];
  }
  
  // Infrastructure / DevOps / Platform
  if (lower.includes('infrastructure') || lower.includes('devops') || lower.includes('platform') || lower.includes('deploy')) {
    return [
      { value: 'devops', title: '8. DevOps / Platform Engineering', reason: 'Automates deployments, monitoring, and keeps infrastructure healthy' },
      { value: 'kanban', title: '5. Kanban / Continuous Flow', reason: 'Perfect for ongoing ops work and incident response' },
      { value: 'agile', title: '1. Agile / Scrum', reason: 'Iterative improvements to infrastructure and tooling' }
    ];
  }
  
  // Default: General software project
  return [
    { value: 'agile', title: '1. Agile / Scrum', reason: 'Most versatile approach - works well for changing requirements and iterative delivery' },
    { value: 'tdd', title: '2. Test-Driven Development (TDD)', reason: 'Ensures code quality and confidence through comprehensive test coverage' },
    { value: 'lean', title: '6. Lean Startup', reason: 'Focus on delivering value quickly and learning from user feedback' }
  ];
}

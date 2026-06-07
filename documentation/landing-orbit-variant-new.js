// Архив варианта "new" — orbit / заставка (облегчённая производительность).
// См. landing-orbit-variants.md

function getOrbitBubbleLayout(index, total, agentId) {
  const hash = hashAgentIdForOrbit(String(agentId || index));
  const golden = 2.399963229728653;
  const t = index + 1;
  const radius = 24 + (t / Math.max(total, 1)) * 24 + (hash % 12);
  const angle = t * golden + (hash % 360) * (Math.PI / 180) * 0.08;
  const x = 50 + Math.cos(angle) * radius * (0.92 + (hash % 7) * 0.015);
  const y = ORBIT_LINK_CENTER.y + Math.sin(angle) * radius * 0.72;
  return {
    x: Math.min(90, Math.max(8, x)),
    y: Math.min(88, Math.max(10, y)),
    size: 58 + (hash % 28),
    duration: 9 + (hash % 6),
    delay: ((hash % 50) / 10).toFixed(1),
    floatX: 10 + (hash % 14),
    floatY: 12 + (hash % 14)
  };
}

const ORBIT_LINK_CENTER = { x: 50, y: 48 };

function renderAppLandingOrbitLinks(agents) {
  if (!appLandingOrbitLinksNode) return [];
  appLandingOrbitLinksNode.replaceChildren();

  if (!Array.isArray(agents) || agents.length === 0) return [];

  const svgNs = "http://www.w3.org/2000/svg";
  const lines = [];
  for (let index = 0; index < agents.length; index += 1) {
    const agent = agents[index];
    const layout = getOrbitBubbleLayout(index, agents.length, agent.id);
    const registryActive = isAgentRegistryActive(agent);

    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("x1", String(ORBIT_LINK_CENTER.x));
    line.setAttribute("y1", String(ORBIT_LINK_CENTER.y));
    line.setAttribute("x2", String(layout.x));
    line.setAttribute("y2", String(layout.y));
    line.classList.add("app-landing-orbit-link");
    if (registryActive) line.classList.add("is-active");
    appLandingOrbitLinksNode.appendChild(line);
    lines.push(line);
  }
  return lines;
}

function renderAppLandingOrbit() {
  if (!appLandingOrbitBubblesNode) return;
  appLandingOrbitBubblesNode.replaceChildren();

  const agents = getAgentsForLandingGrid();
  if (agents.length === 0) {
    renderAppLandingOrbitLinks(agents);
    const empty = document.createElement("p");
    empty.className = "app-landing-orbit-empty";
    empty.textContent = "Нет агентов. Нажмите «+» или откройте реестр.";
    appLandingOrbitBubblesNode.appendChild(empty);
    return;
  }

  agents.forEach((agent, index) => {
    appLandingOrbitBubblesNode.appendChild(createAppLandingOrbitBubble(agent, index, agents.length));
  });

  renderAppLandingOrbitLinks(agents);
}

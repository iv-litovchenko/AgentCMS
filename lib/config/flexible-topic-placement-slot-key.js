/** MCP/API placement.slot for topics with awn-slots-template: flexible */
const FLEXIBLE_TOPIC_PLACEMENT_SLOT = "flexible";

function isFlexibleTopicPlacementSlot(raw) {
  return (
    String(raw || "")
      .trim()
      .toLowerCase() === FLEXIBLE_TOPIC_PLACEMENT_SLOT
  );
}

module.exports = {
  FLEXIBLE_TOPIC_PLACEMENT_SLOT,
  isFlexibleTopicPlacementSlot
};

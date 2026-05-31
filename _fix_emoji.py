import re
# CapabilityMarketplace.tsx
path = "client/src/renderer/pages/CapabilityMarketplace.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
idx = content.find("\u26A0\uFE0F")
print(f"Warning emoji at index: {idx}")
old = '<div key={i} style={{ fontSize: 12, color: C.warning }}>\u26A0\uFE0F {w}</div>'
new = '<div key={i} style={{ fontSize: 12, color: C.warning, display: "flex", alignItems: "center", gap: 4 }}>\n                                            <Icon name="warning" size={12} color={C.warning} /> {w}\n                                        </div>'
print(f"Found: {content.count(old)}")
content = content.replace(old, new)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("CapabilityMarketplace done")

# TaskMarketplace.tsx
path2 = "client/src/renderer/pages/TaskMarketplace.tsx"
with open(path2, "r", encoding="utf-8") as f:
    content2 = f.read()
old2 = '<span>\u2139 {new Date(task.createdAt).toLocaleDateString()}</span>'
new2 = '<span style={{ display: "flex", alignItems: "center", gap: 4 }}>\n                                        <Icon name="info" size={12} color={C.textLight} />\n                                        {new Date(task.createdAt).toLocaleDateString()}\n                                    </span>'
print(f"TaskMarketplace found: {content2.count(old2)}")
content2 = content2.replace(old2, new2)
with open(path2, "w", encoding="utf-8") as f:
    f.write(content2)
print("TaskMarketplace done")
print("All done!")

import re
with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

old_places = """                <div class="analytics-place-events">
                    (${eventsStr})
                </div>"""
new_places = """                <ul class="analytics-sublist" style="margin-top: 8px;">
                    ${Object.entries(eventsObj).map(e => `<li class="analytics-sublist-item" style="border-left:none; padding-left:0;"><span>${e[0]}</span> <span class="analytics-list-count">${e[1]}</span></li>`).join("")}
                </ul>"""

js = js.replace(old_places, new_places)
with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)

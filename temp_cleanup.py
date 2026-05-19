from pathlib import Path
import re
path = Path(r'c:/Users/Al-Quds/hemmaty-leommati/src/routeTree.gen.ts')
text = path.read_text(encoding='utf-8')
text = text.replace("import { Route as JourneyRouteImport } from './routes/journey'\n", "")
text = re.sub(r"const JourneyRoute = JourneyRouteImport\.update\([\s\S]*?\} as any\)\n", "", text)
text = text.replace("  '/journey': typeof JourneyRoute\n", "")
text = text.replace("  JourneyRoute: typeof JourneyRoute\n", "")
text = text.replace("  JourneyRoute: JourneyRoute,\n", "")
text = text.replace("    | '/journey'\n", "")
text = re.sub(r"    '/journey': \{[\s\S]*?parentRoute: typeof rootRouteImport\n    \}\n", "", text)
text = re.sub(r'\n{3,}', '\n\n', text)
path.write_text(text, encoding='utf-8')

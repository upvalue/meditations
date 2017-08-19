import markdown

entries = [""]

with open('utils/enchiridion.txt') as f:
    data = f.readlines()
    for line in data:
        if '.' in line:
            n = line.split('.', 1)
            try:
                number = int(n[0])
                entries.append(n[1])
                continue
            except:
                pass
        entries[-1] += "%s\n" % line


entries = [markdown.markdown("%s\n") % e for e in map(lambda x: x.strip(), entries)]

entries.pop(0)
print("package backend")
print("")

print("var dbseedentries = []struct{Text string}{")
for e in reversed(entries):
    print("\t{`%s`}," % e)
print("}")
print()
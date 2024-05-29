import { Button } from "@mantine/core";
import Image from "next/image";
import { TEditor } from "./editor/TEditor";
import { useCallback, useEffect } from "react";
import { makeClient } from "@/db/config";
import { dropDocTags, insertDocTags, updateDocById } from "@/db/queries.queries";

const diveDoc = (doc: any, loc: string) => {
  if(!doc) return;

  let res : any = [];

  let i = 0;
  if(Array.isArray(doc)) { 

    for(const node of doc) {
      if(node.type === 'heading') {
        res = res.concat(diveDoc(node.content, `${loc}.${i}`));
      }

      if(node.type === 'paragraph') {
        res = res.concat(diveDoc(node.content, `${loc}.${i}`));
      }
      
      if(node.type === 'mention') {
        const {id} = node.attrs;
        res.push({
          type: 'tag',
          loc,
          id,
        });
      }

    i++;
    }

  }

  return res;
}

const Progress = () => {
  useEffect(() => {

  })
}

export default function Home() {
  const updateDocument = useCallback(async (json: string) => {
    'use server';
    const client = await makeClient();

    const tags = diveDoc((json as any).content, '').filter(Boolean);

    console.log({tags});
    await client.query('BEGIN');

    const docId = 'doc-1';

    const res = await updateDocById.run({ body: json, id: docId, revision: 1 }, client);

    dropDocTags.run({ id: docId }, client);

    tags.forEach((t: any) => {
      insertDocTags.run({ doc_id: docId, doc_location: t.loc, tag_name: t.id }, client);
    });

    await client.query('COMMIT');

    await client.end();
  }, []);

  return (
    <main className="flex min-h-screen flex-col justify-between ">
      <div className="flex flex-row">
        <TEditor updateDocument={updateDocument} />
        <div className="second">
          NUMBER TWO
        </div>
      </div>
    </main>
  );
}

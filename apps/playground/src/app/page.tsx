"use client";

import { useState, useCallback } from "react";
import { LinxClient } from "@linxhq/sdk";
import type {
  AuthenticatedLinxClientInstance,
  SessionClientInstance,
  PaginatedResult,
  StateSnapshot,
  EntityResponse,
} from "@linxhq/sdk";
import type { HydratedEntity } from "@linxhq/sdk";
import { RootFactoid } from "@linxhq/sdk";
import styles from "./page.module.css";
import { type LogEntry, createLogEntry, summarizeEntity, errorMessage } from "./utils";

export default function Home() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:3011");
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_LINX_API_KEY || "");
  const [userAccountId, setUserAccountId] = useState(process.env.NEXT_PUBLIC_LINX_ACCOUNT_ID || undefined);

  const [client, setClient] = useState<AuthenticatedLinxClientInstance | null>(null);
  const [session, setSession] = useState<SessionClientInstance | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [entityType, setEntityType] = useState("gasStation");
  const [entityId, setEntityId] = useState("");
  const [createFields, setCreateFields] = useState('{"name": "Test Station"}');

  // Side-by-side comparison state
  const [rawResponse, setRawResponse] = useState<EntityResponse | null>(null);
  const [stateSnapshot, setStateSnapshot] = useState<StateSnapshot | null>(null);
  const [constructedOutput, setConstructedOutput] = useState<unknown>(null);

  const addLog = useCallback(
    (label: string, code: string, result: unknown, status: "success" | "error") => {
      setLogs((prev) => [createLogEntry(label, code, result, status), ...prev]);
    },
    []
  );

  /** Capture raw response and state snapshot from the session after a request */
  const captureInspection = useCallback((s: SessionClientInstance, constructed: unknown) => {
    setRawResponse(s.getLastRawResponse());
    setStateSnapshot(s.getStateSnapshot());
    setConstructedOutput(constructed);
  }, []);

  const handleAuthenticate = async () => {
    try {
      const linx = new LinxClient({ baseUrl });
      const authenticated = await linx.authenticate(apiKey);
      setClient(authenticated);
      setSession(authenticated as unknown as SessionClientInstance);
      addLog(
        "Authenticate",
        `const linx = new LinxClient({ baseUrl: '${baseUrl}' })\nconst client = await linx.authenticate('${apiKey.slice(0, 8)}...')`,
        { permissions: authenticated.permissions },
        "success"
      );
    } catch (err: unknown) {
      addLog("Authenticate", `client.authenticate(...)`, errorMessage(err), "error");
    }
  };

  const handleAs = async () => {
    if (!client) return;
    try {
      const s = await client.as(userAccountId || undefined);
      setSession(s);
      const code = userAccountId
        ? `const session = await client.as('${userAccountId}')`
        : `const session = await client.as()`;
      addLog("Switch Session", code, { permissions: s.permissions }, "success");
    } catch (err: unknown) {
      addLog("Switch Session", `client.as(...)`, errorMessage(err), "error");
    }
  };

  const handleList = async () => {
    if (!session) return;
    try {
      const accessor = (session as any)[entityType];
      const result: PaginatedResult<HydratedEntity> = await accessor.list({ perPage: 5 });
      const code = `const result = await session.${entityType}.list({ perPage: 5 })`;
      const entities = result.data.map(summarizeEntity);
      const constructed = { meta: result.meta, entities };
      addLog(`List ${entityType}`, code, constructed, "success");
      captureInspection(session, constructed);
    } catch (err: unknown) {
      addLog(`List ${entityType}`, `session.${entityType}.list()`, errorMessage(err), "error");
    }
  };

  const handleGet = async () => {
    if (!session || !entityId) return;
    try {
      const accessor = (session as any)[entityType];
      const entity: HydratedEntity = await accessor(entityId);
      const code = `const entity = await session.${entityType}('${entityId}')`;
      const constructed = summarizeEntity(entity);
      addLog(`Get ${entityType}`, code, constructed, "success");
      captureInspection(session, constructed);
    } catch (err: unknown) {
      addLog(`Get ${entityType}`, `session.${entityType}('${entityId}')`, errorMessage(err), "error");
    }
  };

  const handleCreate = async () => {
    if (!session) return;
    try {
      const data = JSON.parse(createFields);
      const accessor = (session as any)[entityType];
      const entity: HydratedEntity = await accessor.create(data);
      const code = `const entity = await session.${entityType}.create(${createFields})`;
      const constructed = summarizeEntity(entity);
      addLog(`Create ${entityType}`, code, constructed, "success");
      captureInspection(session, constructed);
    } catch (err: unknown) {
      addLog(`Create ${entityType}`, `session.${entityType}.create(...)`, errorMessage(err), "error");
    }
  };

  const handleVote = async (direction: "upvote" | "downvote") => {
    if (!session || !entityId) return;
    try {
      const accessor = (session as any)[entityType];
      const entity: HydratedEntity = await accessor(entityId);
      const attrs = entity.getAttributes();
      const firstAttr = Object.values(attrs).find(
        (a): a is RootFactoid => a instanceof RootFactoid
      );
      if (!firstAttr) {
        addLog("Vote", "// no factoids found", "Entity has no simple attributes to vote on", "error");
        return;
      }

      await firstAttr[direction]();
      const code = `const entity = await session.${entityType}('${entityId}')\nconst factoid = entity.${firstAttr.attribute}\nawait factoid.${direction}()`;
      const constructed = {
        factoidId: firstAttr.id,
        attribute: firstAttr.attribute,
        value: firstAttr.value,
        newConfidence: firstAttr.confidenceScore,
      };
      addLog(`${direction} on ${firstAttr.attribute}`, code, constructed, "success");
      captureInspection(session, constructed);
    } catch (err: unknown) {
      addLog(`Vote`, `...${direction}()`, errorMessage(err), "error");
    }
  };

  const hasInspection = rawResponse !== null || stateSnapshot !== null || constructedOutput !== null;
  const hasClient = client !== null;
  const isConnected = session !== null;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Linx SDK Playground</h1>

        {/* Connection */}
        <section className={styles.section}>
          <h2>Connect</h2>
          <div className={styles.fieldRow}>
            <label>
              API URL
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:3333"
              />
            </label>
            <label>
              API Key
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="oat_..."
              />
            </label>
            <button onClick={handleAuthenticate} className={styles.btnPrimary}>
              Authenticate
            </button>
          </div>
          {hasClient && (
            <div className={styles.fieldRow}>
              <label>
                User Account ID (optional)
                <input
                  type="text"
                  value={userAccountId}
                  onChange={(e) => setUserAccountId(e.target.value)}
                  placeholder="Leave empty for app-only mode"
                />
              </label>
              <button onClick={handleAs} className={styles.btnSecondary}>
                .as()
              </button>
            </div>
          )}
          {hasClient && (
            <div className={styles.badge}>
              Connected {userAccountId ? `as ${userAccountId.slice(0, 8)}...` : "(app-only)"}
            </div>
          )}
        </section>

        {/* Entity Operations */}
        {isConnected && (
          <section className={styles.section}>
            <h2>Entity Operations</h2>
            <div className={styles.fieldRow}>
              <label>
                Type
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                  <optgroup label="Place">
                    <option value="place">Place</option>
                    <option value="park">Park</option>
                    <option value="stadiumOrArena">Stadium / Arena</option>
                  </optgroup>
                  <optgroup label="LocalBusiness">
                    <option value="localBusiness">Local Business</option>
                    <option value="serviceStation">Service Station</option>
                    <option value="gasStation">Gas Station</option>
                    <option value="hotel">Hotel</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="fastFoodRestaurant">Fast Food Restaurant</option>
                    <option value="cafeOrCoffeeShop">Cafe / Coffee Shop</option>
                    <option value="barOrPub">Bar / Pub</option>
                    <option value="store">Store</option>
                    <option value="groceryStore">Grocery Store</option>
                    <option value="convenienceStore">Convenience Store</option>
                    <option value="hospital">Hospital</option>
                  </optgroup>
                  <optgroup label="Person">
                    <option value="person">Person</option>
                  </optgroup>
                  <optgroup label="Organization">
                    <option value="organization">Organization</option>
                    <option value="corporation">Corporation</option>
                    <option value="sportsTeam">Sports Team</option>
                  </optgroup>
                  <optgroup label="Thing">
                    <option value="thing">Thing</option>
                  </optgroup>
                </select>
              </label>
              <label>
                Entity ID
                <input
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="UUID"
                />
              </label>
            </div>
            <div className={styles.actions}>
              <button onClick={handleList} className={styles.btnPrimary}>
                .list()
              </button>
              <button onClick={handleGet} className={styles.btnPrimary} disabled={!entityId}>
                .get(id)
              </button>
              <button
                onClick={() => handleVote("upvote")}
                className={styles.btnSecondary}
                disabled={!entityId}
              >
                .upvote()
              </button>
              <button
                onClick={() => handleVote("downvote")}
                className={styles.btnSecondary}
                disabled={!entityId}
              >
                .downvote()
              </button>
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fullWidth}>
                Create Payload (JSON)
                <textarea
                  value={createFields}
                  onChange={(e) => setCreateFields(e.target.value)}
                  rows={3}
                  spellCheck={false}
                />
              </label>
            </div>
            <button onClick={handleCreate} className={styles.btnPrimary}>
              .create()
            </button>
          </section>
        )}

        {/* Side-by-side Inspection */}
        {hasInspection && (
          <section className={styles.section}>
            <div className={styles.logHeader}>
              <h2>Data Inspection</h2>
              <button
                onClick={() => { setRawResponse(null); setStateSnapshot(null); setConstructedOutput(null); }}
                className={styles.btnGhost}
              >
                Clear
              </button>
            </div>
            <div className={styles.comparison}>
              {/* Left: Raw API Response */}
              <div className={styles.comparisonPanel}>
                <div className={styles.panelHeader}>
                  <h3>Raw API Response</h3>
                  <span className={styles.panelBadge}>Before SDK</span>
                </div>
                <div className={styles.panelSection}>
                  <h4>
                    Entities
                    {rawResponse && <span className={styles.countBadge}>{rawResponse.entities.length}</span>}
                  </h4>
                  <pre className={styles.panelCode}>
                    {rawResponse
                      ? JSON.stringify(rawResponse.entities, null, 2)
                      : "No data yet"}
                  </pre>
                </div>
                <div className={styles.panelSection}>
                  <h4>
                    Factoids
                    {rawResponse && <span className={styles.countBadge}>{rawResponse.factoids.length}</span>}
                  </h4>
                  <pre className={styles.panelCode}>
                    {rawResponse
                      ? JSON.stringify(rawResponse.factoids, null, 2)
                      : "No data yet"}
                  </pre>
                </div>
              </div>

              {/* Right: Constructed Output */}
              <div className={styles.comparisonPanel}>
                <div className={styles.panelHeader}>
                  <h3>Constructed Output</h3>
                  <span className={styles.panelBadge}>After SDK</span>
                </div>
                <div className={styles.panelSection}>
                  <h4>Hydrated Result</h4>
                  <pre className={styles.panelCode}>
                    {constructedOutput
                      ? JSON.stringify(constructedOutput, null, 2)
                      : "No data yet"}
                  </pre>
                </div>
                <div className={styles.panelSection}>
                  <h4>
                    State Manager
                    {stateSnapshot && (
                      <span className={styles.countBadge}>
                        {String(Object.keys(stateSnapshot.entities).length)} entities, {String(Object.keys(stateSnapshot.factoids).length)} factoids
                      </span>
                    )}
                  </h4>
                  <pre className={styles.panelCode}>
                    {stateSnapshot
                      ? JSON.stringify(stateSnapshot, null, 2)
                      : "No data yet"}
                  </pre>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Output Log */}
        <section className={styles.section}>
          <div className={styles.logHeader}>
            <h2>Output</h2>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className={styles.btnGhost}>
                Clear
              </button>
            )}
          </div>
          {logs.length === 0 && (
            <p className={styles.emptyState}>
              Connect and run SDK methods to see results here.
            </p>
          )}
          <div className={styles.logList}>
            {logs.map((entry) => (
              <div
                key={entry.id}
                className={`${styles.logEntry} ${entry.status === "error" ? styles.logError : styles.logSuccess
                  }`}
              >
                <div className={styles.logMeta}>
                  <span className={styles.logLabel}>{entry.label}</span>
                  <span className={styles.logTime}>
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className={styles.logCode}>{entry.code}</pre>
                <pre className={styles.logResult}>{entry.result}</pre>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

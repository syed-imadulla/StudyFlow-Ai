

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

export class AiController {
  /**
   * Proxy chat request to Python backend
   */
  static async chat(req, res) {
    try {
      const { prompt, thread_id, agent_type } = req.body;
      const token = req.headers.authorization; // Forward the exact Bearer token

      const controller = new AbortController();
      const timeout = setTimeout(() => { controller.abort(); }, 60000);

      const response = await fetch(`${PYTHON_AI_URL}/api/v1/agent/insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ prompt, thread_id, agent_type }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('[AI Proxy Error - Chat]:', error);
      res.status(502).json({
        success: false,
        message: 'StudyFlow AI is currently offline or unreachable. Your data is safe.'
      });
    }
  }

  /**
   * Proxy HITL action resume request to Python backend
   */
  static async resumeAction(req, res) {
    try {
      const { thread_id, approved } = req.body;
      const token = req.headers.authorization;

      if (!thread_id || typeof approved !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Missing thread_id or approved boolean' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => { controller.abort(); }, 60000);

      const response = await fetch(`${PYTHON_AI_URL}/api/v1/agent/action/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ thread_id, approved }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('[AI Proxy Error - Resume]:', error);
      res.status(502).json({
        success: false,
        message: 'StudyFlow AI is currently offline or unreachable. Your data is safe.'
      });
    }
  }
}

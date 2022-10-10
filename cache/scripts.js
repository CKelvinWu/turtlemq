module.exports = {
  setRoleScript: `
  local MASTER_KEY = KEYS[1]
  local REPLICA_KEY = KEYS[2]
  local ip = ARGV[1]
  local master = redis.call("GET", MASTER_KEY)
  if (master) then
    redis.call("HSET", REPLICA_KEY, ip, 1)
    return "replica"
  else
    redis.call("SET", MASTER_KEY, ip)
    return "master"
  end

  `,
};

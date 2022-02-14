import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { Badge, Button, Tooltip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

import styles from './styles.scss';
import { fetchServer, syncServerChannels, useAppDispatch, useAppSelector } from 'App/redux';
import Definition from 'App/components/Definition';
import ChannelList from 'App/components/ChannelList';
import Loader from 'App/components/Loader';
import Empty from 'App/components/Empty';
import { numberAdjust } from 'App/utils';
import Language from 'App/components/Language';

const cx = require('classnames/bind').bind(styles);

function ServerPage() {
  const dispatch = useAppDispatch();
  const { id: guildId } = useParams();

  const serverState = useAppSelector((state) => state.server);
  const server = serverState.value;

  useEffect(() => {
    if (guildId) {
      dispatch(fetchServer(guildId));
    }
  }, [dispatch, guildId]);

  const syncChannels = () => {
    if (guildId) {
      dispatch(syncServerChannels({ id: guildId }));
    }
  };

  return (
    <div className={cx('server-page')}>
      {guildId && (
        <>
          <Loader isLoading={serverState.isLoading}>
            {server ? (
              <>
                <div className={cx('server-page__title')}>
                  <img src={server.iconUrl} alt={server.name} />
                  <h2>{server.name}</h2>
                  <div>
                    <Tooltip title="Member count">
                      <Badge
                        badgeContent={numberAdjust(server.memberCount)}
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        color="primary"
                      >
                        <PeopleIcon />
                      </Badge>
                    </Tooltip>
                  </div>
                  <div>
                    <Tooltip title="Shard ID">
                      <Badge
                        badgeContent={server.shardId.toString()}
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        color="primary"
                      >
                        <StorageOutlinedIcon />
                      </Badge>
                    </Tooltip>
                  </div>
                </div>
                <div className={cx('server-page__info')}>
                  <div>
                    <Definition title="Id">{server.id}</Definition>
                    <Definition title="Language">
                      <Language language={server.lang} />
                    </Definition>
                    <Definition title="Prefix">{server.prefix}</Definition>
                  </div>
                  <div>
                    <Definition title="Rater Engine">{server.raterEngine}</Definition>
                    <Definition title="Rater Language">
                      <Language language={server.raterLang} />
                    </Definition>
                  </div>
                  <div>
                    <Definition title="Members">{server.memberCount}</Definition>
                    <Definition title="Members in DB">{server.localUserCount}</Definition>
                  </div>
                </div>
                <div className={cx('server-page__controls')}>
                  <Button onClick={syncChannels} disabled={serverState.isSending} variant="contained">
                    Rescan
                  </Button>
                </div>
              </>
            ) : (
              <Empty isError />
            )}
          </Loader>
          <ChannelList serverId={guildId} mainChannelId={server?.mainChannelId} />
        </>
      )}
    </div>
  );
}

export default ServerPage;

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Badge, Button } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';

import styles from './styles.scss';
import { fetchServer, syncServerChannels, useAppDispatch, useAppSelector } from 'App/redux';
import Definition from 'App/components/Definition';
import ChannelList from 'App/components/ChannelList';

const cx = require('classnames/bind').bind(styles);

function ServerPage() {
  const [isMounting, setIsMounting] = useState(true);

  const dispatch = useAppDispatch();
  const { id: serverId } = useParams();

  const serverState = useAppSelector((state) => state.server);
  const server = serverState.value;

  useEffect(() => {
    if (serverId) {
      dispatch(fetchServer(serverId));
    }
  }, [dispatch, serverId]);

  useEffect(() => {
    if (serverState.isLoading) {
      setIsMounting(false);
    }
  }, [dispatch, serverState.isLoading]);

  const syncChannels = () => {
    if (serverId) {
      dispatch(syncServerChannels({ id: serverId }));
    }
  };

  return (
    <div className={cx('server-page')}>
      {serverId && server && !isMounting && (
        <>
          <div className={cx('server-page__title')}>
            <img src={server.iconUrl} alt={server.name} />
            <h2>{server.name}</h2>
            <div>
              <Badge
                badgeContent={server.memberCount}
                max={9999}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                color="primary"
              >
                <PeopleIcon />
              </Badge>
            </div>
          </div>
          <div className={cx('server-page__info')}>
            <div>
              <Definition title="Id">{server.id}</Definition>
              <Definition title="Language">{server.lang}</Definition>
              <Definition title="Prefix">{server.prefix}</Definition>
            </div>
            <div>
              <Definition title="Rater Engine">{server.raterEngine}</Definition>
              <Definition title="Rater Language">{server.raterLang}</Definition>
            </div>
          </div>
          <div className={cx('server-page__controls')}>
            <Button onClick={syncChannels} disabled={serverState.isSending} variant="contained">
              Rescan
            </Button>
          </div>
          <ChannelList serverId={serverId} />
        </>
      )}
    </div>
  );
}

export default ServerPage;
